import { sendAdminPurchaseEmailIfNeeded } from './adminPurchaseEmail.js'
import { sendOrderReceiptIfNeeded } from './confirmationEmail.js'

export async function sendPaidOrderEmails(orderId: string) {
  const results = await Promise.allSettled([
    sendOrderReceiptIfNeeded(orderId),
    sendAdminPurchaseEmailIfNeeded(orderId),
  ])
  if (results[0].status === 'rejected')
    console.error('[email] customer receipt failed', { orderId })
  if (results[1].status === 'rejected') throw results[1].reason
}
