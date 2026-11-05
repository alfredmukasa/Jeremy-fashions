import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

test('saved legacy addresses expose an editable delivery phone field and validation error', async () => {
  const server = await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error',ssr:{external:['react','react-dom','react-router-dom']}})
  try {
    const { CheckoutShippingSelector } = await server.ssrLoadModule('/src/components/checkout/CheckoutShippingSelector.tsx')
    const html = renderToStaticMarkup(createElement(MemoryRouter,null,createElement(CheckoutShippingSelector,{
      addresses:[{id:'legacy',fullName:'Test Customer',line1:'123 Test St',city:'Toronto',region:'ON',postalCode:'M5V 1A1',country:'Canada',isDefault:true}],
      isLoading:false,selectedAddressId:'legacy',useNewAddress:false,
      register:(name:string)=>({name}),errors:{shipping:{phone:{message:'Enter a valid contact number (7–15 digits).'}}},
      watch:()=>'',setValue:()=>{},onSelectSavedAddress:()=>{},onUseNewAddress:()=>{},
    })))
    assert.match(html,/type="tel"/)
    assert.match(html,/name="shipping.phone"/)
    assert.match(html,/Contact number/)
    assert.match(html,/Enter a valid contact number/)
    assert.match(html,/aria-invalid="true"/)
    assert.equal((html.match(/id="shipping-phone"/g)??[]).length,1)
  } finally {await server.close()}
})
