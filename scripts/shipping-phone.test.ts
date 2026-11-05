import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { isValidShippingPhone } from '../src/utils/shippingPhone.ts'
import { isValidShippingPhone as serverValid } from '../server/src/domain/shippingPhone.ts'
import { shippingAddressToCheckoutValues, checkoutValuesToShippingAddressInput } from '../src/utils/shippingAddress.ts'

process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-placeholder'
const { validateCreatePaymentIntent } = await import('../server/src/middleware/validateCheckout.ts')
const { toAddressJson, parseAddress } = await import('../server/src/services/orderService.ts')
const { formatShippingAddress } = await import('../server/src/services/confirmationEmail.ts')
const address = { fullName: 'Shipping Test', phone: '+1 (416) 555-0123', line1: '123 Test St', city: 'Toronto', region: 'Ontario', postalCode: 'M5V 1A1', country: 'Canada' }

test('client and server accept international formatting and reject invalid contact numbers', () => {
  for (const value of ['+1 (416) 555-0123', '+44 20 7946 0958', '02079460958', '5550123']) {
    assert.equal(isValidShippingPhone(value), true); assert.equal(serverValid(value), true)
  }
  for (const value of [undefined, null, 4165550123, '', '  ', '123', '+1234567890123456', 'call me', '123+4567890', '<script>4165550123</script>']) {
    assert.equal(isValidShippingPhone(value), false); assert.equal(serverValid(value), false)
  }
})

test('checkout rejects absent/invalid phone before payment and accepts separate billing without phone', () => {
  for (const phone of [undefined, '', '123', 4165550123, address.phone]) {
    const req = { body: { idempotencyKey: 'phone-test-key', email: 'shipping@example.com', items: [{productId:'test',quantity:1}], shippingAddress: {...address, phone}, billingAddress: {...address, phone: undefined}, billingSameAsShipping: false } }
    let status = 200; let next = false
    const res = { status(code: number) { status = code; return this }, json() { return this } }
    validateCreatePaymentIntent(req as never, res as never, (() => { next = true }) as never)
    assert.equal(status, phone === address.phone ? 200 : 400)
    assert.equal(next, phone === address.phone)
    if (next) assert.equal(req.body.shippingAddress.phone, address.phone)
  }
})

test('phone survives saved-address mapping, order snapshot, order read and receipt formatting', () => {
  const saved = { ...address, id:'test', createdAt:'', updatedAt:'', isDefault:true }
  const checkout = shippingAddressToCheckoutValues(saved)
  assert.equal(checkoutValuesToShippingAddressInput(checkout).phone, address.phone)
  const snapshot = toAddressJson(checkout)
  assert.equal(snapshot.phone, address.phone)
  assert.equal(parseAddress(snapshot)?.phone, address.phone)
  assert.match(formatShippingAddress(snapshot)!, /Tel: \+1 \(416\) 555-0123/)
  assert.equal(shippingAddressToCheckoutValues({...saved, phone:undefined}).phone, '')
  assert.equal(parseAddress({...snapshot, phone:undefined})?.phone, undefined)
})

test('migration preserves legacy addresses, validates phones, and keeps ownership policies', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create role authenticated;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');`)
    await db.exec(await readFile('supabase/migrations/0009_user_shipping_addresses.sql', 'utf8'))
    await db.exec(`insert into user_shipping_addresses(user_id,full_name,line1,city,region,postal_code,country)
      values ('00000000-0000-0000-0000-000000000001','Legacy','Test','Toronto','ON','M5V 1A1','Canada')`)
    await db.exec(await readFile('supabase/migrations/0024_shipping_contact_phone.sql', 'utf8'))
    assert.equal((await db.query<{phone:string|null}>('select phone from user_shipping_addresses')).rows[0].phone, null)
    await db.query('update user_shipping_addresses set phone=$1', [address.phone])
    assert.equal((await db.query<{phone:string}>('select phone from user_shipping_addresses')).rows[0].phone, address.phone)
    for (const phone of ['', 'abc', '123', '+1234567890123456']) {
      await assert.rejects(db.query('update user_shipping_addresses set phone=$1', [phone]), /phone_format/)
    }
    await db.exec(`grant usage on schema public,auth to authenticated; grant select,update on user_shipping_addresses to authenticated;
      set role authenticated; select set_config('test.uid','00000000-0000-0000-0000-000000000002',false);`)
    assert.equal((await db.query('select phone from user_shipping_addresses')).rows.length, 0)
    assert.equal((await db.query("update user_shipping_addresses set phone='5550123' returning id")).rows.length, 0)
  } finally { await db.close() }
})
