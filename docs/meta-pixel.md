# Meta Pixel

Pixel ID: 1423982003235704 (from the supplied meta pixel.pdf).

Advertising consent is required before the external Meta script loads. Rejecting keeps shopping functional; the footer preference control allows withdrawal. No noscript beacon bypasses consent. Automatic event configuration is disabled. Application event payloads omit customer email, phone, and address. Sensitive account/auth paths and checkout URLs containing payment secrets are excluded from explicit events.

Events: PageView on router navigation, ViewContent for loaded products, AddToCart from the cart action, InitiateCheckout after the checkout API prepares payment, and Purchase only from server-confirmed paid order data. Values use CAD; Purchase uses the server-returned currency and total. Purchase IDs are deduplicated in memory and local storage. Browser blocking or cleared storage can affect delivery/deduplication; this is browser Pixel only, not Conversions API.

Product ViewContent and AddToCart content_ids use the database product UUID. Any Meta catalog must use these same IDs. A catalog/feed and paid campaigns have NOT been created by this integration. Purchase currently reports value/currency, not catalog item IDs.

Build and isolated tracking tests pass. The test uses a mocked browser and makes no Meta requests. Verify event receipt in Meta Events Manager Test Events with consent granted before running paid ads. No real purchase or synthetic live Purchase event was sent during implementation.

Test: node --import ./server/node_modules/tsx/dist/loader.mjs --test scripts/meta-pixel.test.ts
