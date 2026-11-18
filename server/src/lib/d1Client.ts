import { randomUUID } from 'node:crypto'

import { queryD1 } from './d1.js'

type DbError = { message: string; code?: string }
type DbResult<T> = { data: T; error: DbError | null }

type Filter =
  | { kind: 'eq'; column: string; value: unknown }
  | { kind: 'in'; column: string; value: unknown[] }
  | { kind: 'not-in'; column: string; value: unknown[] }
  | { kind: 'null'; column: string }

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/i

function ident(value: string): string {
  if (!IDENTIFIER.test(value)) throw new Error(`Invalid identifier: ${value}`)
  return value
}

export function coerceWriteValue(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return value
}

export function coerceReadRow(row: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          next[key] = JSON.parse(trimmed) as unknown
          continue
        } catch {
          next[key] = value
          continue
        }
      }
    }
    if ((value === 0 || value === 1) && (key === 'featured' || key === 'active' || key === 'waitlist_mode')) {
      next[key] = value === 1
      continue
    }
    next[key] = value
  }
  return next
}

function parseNotIn(raw: string): unknown[] {
  return raw.replace(/^\(/, '').replace(/\)$/, '').split(',').map((part) => part.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '')).filter(Boolean)
}

class D1Request {
  private filters: Filter[] = []
  private columns = '*'
  private orderBy: Array<{ column: string; direction: 'asc' | 'desc' }> = []
  private rowLimit: number | null = null
  private rowOffset = 0
  private conflictColumns: string[] = []
  private write: { kind: 'insert'; rows: Record<string, unknown>[] } | { kind: 'update'; patch: Record<string, unknown> } | { kind: 'delete' } | null = null
  private resultMode: 'one' | 'maybe' | 'many' = 'many'

  constructor(private readonly table: string) {}

  select(columns = '*'): this { this.columns = columns; return this }
  eq(column: string, value: unknown): this { this.filters.push({ kind: 'eq', column, value }); return this }
  in(column: string, value: unknown[]): this { this.filters.push({ kind: 'in', column, value }); return this }
  neq(column: string, value: unknown): this { this.filters.push({ kind: 'not-in', column, value: [value] }); return this }
  is(column: string, value: null): this {
    if (value !== null) throw new Error('Only IS NULL filters are supported.')
    this.filters.push({ kind: 'null', column })
    return this
  }
  not(column: string, operator: string, value: string): this {
    if (operator !== 'in') throw new Error(`Unsupported filter ${operator}`)
    this.filters.push({ kind: 'not-in', column, value: parseNotIn(value) })
    return this
  }
  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy.push({ column, direction: options?.ascending === false ? 'desc' : 'asc' })
    return this
  }
  limit(count: number): this { this.rowLimit = count; return this }
  range(from: number, to: number): this {
    this.rowOffset = Math.max(0, from)
    this.rowLimit = Math.max(0, to - from + 1)
    return this
  }
  private withId(row: Record<string, unknown>): Record<string, unknown> {
    if (row.id || row.key || row.order_id) return row
    return { id: randomUUID(), ...row }
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    const rows = Array.isArray(values) ? values : [values]
    this.write = { kind: 'insert', rows: rows.map((row) => this.withId(row)) }
    return this
  }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): this {
    const columns = (options?.onConflict ?? 'id').split(',').map((column) => column.trim()).filter(Boolean)
    this.conflictColumns = columns.length ? columns : ['id']
    return this.insert(values)
  }
  update(patch: Record<string, unknown>): this { this.write = { kind: 'update', patch }; return this }
  delete(): this { this.write = { kind: 'delete' }; return this }
  maybeSingle(): Promise<DbResult<Record<string, unknown> | null>> { this.resultMode = 'maybe'; return this.execute() as Promise<DbResult<Record<string, unknown> | null>> }
  single(): Promise<DbResult<Record<string, unknown>>> { this.resultMode = 'one'; return this.execute() as Promise<DbResult<Record<string, unknown>>> }
  then<TResult1 = DbResult<Record<string, unknown>[]>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<Record<string, unknown>[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return (this.execute() as Promise<DbResult<Record<string, unknown>[]>>).then(onfulfilled, onrejected)
  }

  private where(): { sql: string; params: unknown[] } {
    const params: unknown[] = []
    const parts = this.filters.map((filter) => {
      const column = ident(filter.column)
      if (filter.kind === 'null') return `${column} IS NULL`
      if (filter.kind === 'eq') { params.push(coerceWriteValue(filter.value)); return `${column} = ?` }
      const values = filter.value.map((value) => coerceWriteValue(value))
      if (values.length === 0) return filter.kind === 'in' ? '0' : '1'
      params.push(...values)
      return filter.kind === 'in' ? `${column} IN (${values.map(() => '?').join(', ')})` : `${column} NOT IN (${values.map(() => '?').join(', ')})`
    })
    return { sql: parts.length ? ` WHERE ${parts.join(' AND ')}` : '', params }
  }

  private async execute(): Promise<DbResult<unknown>> {
    try {
      const table = ident(this.table)
      const where = this.where()
      if (this.write?.kind === 'insert') {
        const inserted: Record<string, unknown>[] = []
        for (const row of this.write.rows) {
          const keys = Object.keys(row)
          const assignments = keys.filter((key) => !this.conflictColumns.includes(key)).map((key) => `${ident(key)} = excluded.${ident(key)}`).join(', ')
          const conflict = this.conflictColumns.length ? ` ON CONFLICT(${this.conflictColumns.map(ident).join(', ')}) DO ${assignments ? `UPDATE SET ${assignments}` : 'NOTHING'}` : ''
          const sql = `INSERT INTO ${table} (${keys.map(ident).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})${conflict} RETURNING *`
          const result = await queryD1<Record<string, unknown>>(sql, keys.map((key) => coerceWriteValue(row[key])))
          inserted.push(coerceReadRow(result[0] ?? row))
        }
        return { data: this.resultMode === 'many' ? inserted : inserted[0] ?? null, error: null }
      }
      if (this.write?.kind === 'update') {
        const patch = this.write.patch
        const keys = Object.keys(patch)
        const sql = `UPDATE ${table} SET ${keys.map((key) => `${ident(key)} = ?`).join(', ')}${where.sql} RETURNING *`
        const rows = (await queryD1<Record<string, unknown>>(sql, [...keys.map((key) => coerceWriteValue(patch[key])), ...where.params])).map(coerceReadRow)
        if (this.resultMode === 'one' && rows.length !== 1) return { data: null, error: { message: rows.length === 0 ? 'No row updated' : 'Multiple rows updated' } }
        return { data: this.resultMode === 'many' ? rows : rows[0] ?? null, error: null }
      }
      if (this.write?.kind === 'delete') {
        await queryD1(`DELETE FROM ${table}${where.sql}`, where.params)
        return { data: null, error: null }
      }
      const order = this.orderBy.length ? ` ORDER BY ${this.orderBy.map((entry) => `${ident(entry.column)} ${entry.direction === 'desc' ? 'DESC' : 'ASC'}`).join(', ')}` : ''
      const limit = this.rowLimit != null ? ` LIMIT ${Math.max(0, Math.floor(this.rowLimit))}` : ''
      const offset = this.rowOffset > 0 ? ` OFFSET ${Math.floor(this.rowOffset)}` : ''
      const columnSql = this.columns === '*' ? '*' : this.columns.split(',').map((column) => ident(column.trim())).join(', ')
      const rows = (await queryD1<Record<string, unknown>>(`SELECT ${columnSql} FROM ${table}${where.sql}${order}${limit}${offset}`, where.params)).map(coerceReadRow)
      if (this.resultMode === 'maybe') return { data: rows[0] ?? null, error: null }
      if (this.resultMode === 'one') return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: 'Expected one row' } }
      return { data: rows, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'D1 request failed'
      const lower = message.toLowerCase()
      return { data: null, error: { message: lower.includes('no such column') ? `${message} (column does not exist)` : message, code: lower.includes('unique constraint') ? '23505' : undefined } }
    }
  }
}

export function d1From(table: string): any { return new D1Request(table) }
export const d1Client = { from: d1From }
export type StoreDb = typeof d1Client
