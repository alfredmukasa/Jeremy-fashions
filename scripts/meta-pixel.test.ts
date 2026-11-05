import test from 'node:test'
import assert from 'node:assert/strict'
import {trackMeta, trackPurchase, setAdvertisingConsent} from '../src/lib/metaPixel.ts'

test('Meta is consent gated, initializes once, excludes sensitive routes, and deduplicates paid purchases', () => {
  const storage = new Map<string,string>()
  const scripts: unknown[] = []
  const events = new EventTarget()
  Object.assign(globalThis, {
    localStorage: {getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},
    window: {location:{pathname:'/shop',search:''},dispatchEvent:events.dispatchEvent.bind(events)},
    document: {createElement:()=>({}),head:{appendChild:(s:unknown)=>scripts.push(s)}},
  })
  assert.equal(trackMeta('PageView'),false)
  assert.equal(scripts.length,0)
  setAdvertisingConsent(true)
  assert.equal(trackMeta('PageView',{},'page-1'),true)
  assert.equal(trackMeta('PageView',{},'page-1'),false)
  assert.equal(scripts.length,1)
  const queue = window.fbq!.queue
  assert.equal(queue.filter(e=>e[0]==='init').length,1)
  trackPurchase({orderId:'test',paymentStatus:'processing',totalAmount:12,currency:'cad'})
  assert.equal(queue.filter(e=>e[1]==='Purchase').length,0)
  const order={orderId:'test',paymentStatus:'paid',totalAmount:12,currency:'cad'}
  trackPurchase(order);trackPurchase(order)
  assert.equal(queue.filter(e=>e[1]==='Purchase').length,1)
  assert.deepEqual(queue.find(e=>e[1]==='Purchase')?.[2],{value:12,currency:'CAD'})
  window.location.search='?payment_intent_client_secret=secret'
  assert.equal(trackMeta('PageView'),false)
  window.location.search='';window.location.pathname='/account'
  assert.equal(trackMeta('PageView'),false)
  window.location.pathname='/shop';setAdvertisingConsent(false)
  assert.equal(trackMeta('AddToCart'),false)
})
