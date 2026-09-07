import type { ProductKind, SizeChart, SizeChartColumn, SizeChartUnit } from '../types'

export const SIZE_CHART_ATTRIBUTE_KEY = 'sizeChart'

const APPAREL_COLUMNS: SizeChartColumn[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'waist', label: 'Waist' },
  { id: 'hip', label: 'Hip' },
  { id: 'length', label: 'Length' },
  { id: 'sleeve', label: 'Sleeve' },
]

const FOOTWEAR_COLUMNS: SizeChartColumn[] = [
  { id: 'us', label: 'US' },
  { id: 'uk', label: 'UK' },
  { id: 'eu', label: 'EU' },
  { id: 'cm', label: 'Foot (cm)' },
]

const ACCESSORY_COLUMNS: SizeChartColumn[] = [
  { id: 'width', label: 'Width' },
  { id: 'height', label: 'Height' },
  { id: 'depth', label: 'Depth' },
]

/** Unisex garment specs in inches — typical fleece / cut-and-sew block. */
const APPAREL_INCHES: Record<string, Record<string, string>> = {
  XXS: { chest: '32–34', waist: '26–28', hip: '32–34', length: '25', sleeve: '23' },
  XS: { chest: '34–36', waist: '28–30', hip: '34–36', length: '26', sleeve: '24' },
  S: { chest: '36–38', waist: '30–32', hip: '36–38', length: '27', sleeve: '25' },
  M: { chest: '38–40', waist: '32–34', hip: '38–40', length: '28', sleeve: '26' },
  L: { chest: '40–43', waist: '34–37', hip: '40–43', length: '29', sleeve: '27' },
  XL: { chest: '43–46', waist: '37–40', hip: '43–46', length: '30', sleeve: '28' },
  XXL: { chest: '46–50', waist: '40–44', hip: '46–50', length: '31.5', sleeve: '29' },
}

const FOOTWEAR_DEFAULTS: Record<string, Record<string, string>> = {
  '7': { us: '7', uk: '6', eu: '40', cm: '25' },
  '7.5': { us: '7.5', uk: '6.5', eu: '40.5', cm: '25.5' },
  '8': { us: '8', uk: '7', eu: '41', cm: '26' },
  '8.5': { us: '8.5', uk: '7.5', eu: '42', cm: '26.5' },
  '9': { us: '9', uk: '8', eu: '42.5', cm: '27' },
  '9.5': { us: '9.5', uk: '8.5', eu: '43', cm: '27.5' },
  '10': { us: '10', uk: '9', eu: '44', cm: '28' },
  '10.5': { us: '10.5', uk: '9.5', eu: '44.5', cm: '28.5' },
  '11': { us: '11', uk: '10', eu: '45', cm: '29' },
  '11.5': { us: '11.5', uk: '10.5', eu: '45.5', cm: '29.5' },
  '12': { us: '12', uk: '11', eu: '46', cm: '30' },
  '13': { us: '13', uk: '12', eu: '47.5', cm: '31' },
}

function notesForKind(kind: ProductKind): string {
  if (kind === 'footwear') {
    return 'US sizing. If you are between sizes, take the larger size. Width is a standard D last unless noted.'
  }
  if (kind === 'accessories') {
    return 'Dimensions are approximate and measured at the widest points of the piece.'
  }
  return 'Garment measurements, not body measurements. If you are between sizes, size up for a relaxed fit.'
}

export function sizeChartColumnsForKind(kind: ProductKind): SizeChartColumn[] {
  if (kind === 'footwear') return FOOTWEAR_COLUMNS.map((column) => ({ ...column }))
  if (kind === 'accessories') return ACCESSORY_COLUMNS.map((column) => ({ ...column }))
  return APPAREL_COLUMNS.map((column) => ({ ...column }))
}

export function emptySizeChart(kind: ProductKind, sizes: string[] = []): SizeChart {
  return {
    unit: kind === 'footwear' ? 'cm' : 'in',
    columns: sizeChartColumnsForKind(kind),
    rows: sizes.map((size) => ({ size, values: {} })),
    notes: notesForKind(kind),
  }
}

function convertNumber(value: number, from: SizeChartUnit, to: SizeChartUnit): string {
  if (from === to) return String(value)
  if (from === 'in' && to === 'cm') return (value * 2.54).toFixed(1).replace(/\.0$/, '')
  return (value / 2.54).toFixed(1).replace(/\.0$/, '')
}

export function convertMeasurement(value: string, from: SizeChartUnit, to: SizeChartUnit): string {
  if (!value.trim() || from === to) return value
  return value.replace(/(\d+(?:\.\d+)?)/g, (match) => convertNumber(Number(match), from, to))
}

function standardValues(kind: ProductKind, size: string): Record<string, string> {
  if (kind === 'footwear') return FOOTWEAR_DEFAULTS[size] ?? { us: size, uk: '', eu: '', cm: '' }
  if (kind === 'accessories') return { width: '', height: '', depth: '' }
  return APPAREL_INCHES[size] ?? { chest: '', waist: '', hip: '', length: '', sleeve: '' }
}

export function fillStandardSizeChart(kind: ProductKind, sizes: string[], unit: SizeChartUnit = 'in'): SizeChart {
  const sourceUnit: SizeChartUnit = kind === 'footwear' ? 'cm' : 'in'
  const columns = sizeChartColumnsForKind(kind)
  return {
    unit,
    columns,
    notes: notesForKind(kind),
    rows: sizes.map((size) => {
      const source = standardValues(kind, size)
      const values: Record<string, string> = {}
      for (const column of columns) {
        const raw = source[column.id] ?? ''
        values[column.id] =
          kind === 'footwear' && (column.id === 'us' || column.id === 'uk' || column.id === 'eu')
            ? raw
            : convertMeasurement(raw, sourceUnit, unit)
      }
      return { size, values }
    }),
  }
}

export function syncSizeChartRows(chart: SizeChart, sizes: string[], kind: ProductKind): SizeChart {
  const existing = new Map(chart.rows.map((row) => [row.size, row]))
  return {
    ...chart,
    columns: chart.columns.length ? chart.columns : sizeChartColumnsForKind(kind),
    rows: sizes.map((size) => existing.get(size) ?? { size, values: {} }),
  }
}

export function sizeChartHasMeasurements(chart: SizeChart | null | undefined): boolean {
  if (!chart?.rows.length) return false
  return chart.rows.some((row) => Object.values(row.values).some((value) => value.trim().length > 0))
}

export function parseSizeChart(raw: unknown): SizeChart | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const source = raw as Record<string, unknown>
  const nested =
    source[SIZE_CHART_ATTRIBUTE_KEY] && typeof source[SIZE_CHART_ATTRIBUTE_KEY] === 'object'
      ? (source[SIZE_CHART_ATTRIBUTE_KEY] as Record<string, unknown>)
      : 'rows' in source || 'columns' in source
        ? source
        : null

  if (!nested) return null

  const unit: SizeChartUnit = nested.unit === 'cm' ? 'cm' : 'in'
  const columns = Array.isArray(nested.columns)
    ? nested.columns
        .filter((column): column is { id?: unknown; label?: unknown } => !!column && typeof column === 'object')
        .map((column, index) => ({
          id: typeof column.id === 'string' && column.id.trim() ? column.id.trim() : `col-${index}`,
          label: typeof column.label === 'string' && column.label.trim() ? column.label.trim() : `Column ${index + 1}`,
        }))
        .filter((column) => column.id)
    : []

  const rows = Array.isArray(nested.rows)
    ? nested.rows
        .filter((row): row is { size?: unknown; values?: unknown } => !!row && typeof row === 'object')
        .map((row) => {
          const values: Record<string, string> = {}
          if (row.values && typeof row.values === 'object' && !Array.isArray(row.values)) {
            for (const [key, value] of Object.entries(row.values as Record<string, unknown>)) {
              if (typeof value === 'string') values[key] = value
              else if (typeof value === 'number' && Number.isFinite(value)) values[key] = String(value)
            }
          }
          return {
            size: typeof row.size === 'string' ? row.size : '',
            values,
          }
        })
        .filter((row) => row.size.trim().length > 0)
    : []

  if (!columns.length || !rows.length) return null

  return {
    unit,
    columns,
    rows,
    notes: typeof nested.notes === 'string' ? nested.notes : '',
  }
}

export function attributesWithoutSizeChart(raw: Record<string, unknown>): Record<string, unknown> {
  const { [SIZE_CHART_ATTRIBUTE_KEY]: _ignored, ...rest } = raw
  return rest
}

export function mergeSizeChartIntoAttributes(
  attributes: Record<string, unknown>,
  sizeChart: SizeChart | null | undefined,
): Record<string, unknown> {
  const next = attributesWithoutSizeChart(attributes)
  if (sizeChart && (sizeChart.rows.length > 0 || sizeChart.notes.trim())) {
    next[SIZE_CHART_ATTRIBUTE_KEY] = sizeChart
  }
  return next
}

export function resolveSizeChart(
  _kind: ProductKind,
  _sizes: string[],
  stored: SizeChart | null | undefined,
): SizeChart | null {
  return sizeChartHasMeasurements(stored) ? (stored as SizeChart) : null
}

export function howToMeasureCopy(kind: ProductKind): string {
  if (kind === 'footwear') {
    return 'Measure the length of your foot from heel to longest toe while standing. Compare that length with the Foot (cm) column.'
  }
  if (kind === 'accessories') {
    return 'Width, height, and depth are measured at the widest exterior points of the piece.'
  }
  return 'Chest, waist, and hip are measured across the garment and doubled. Length is measured from the highest shoulder point to the hem.'
}
