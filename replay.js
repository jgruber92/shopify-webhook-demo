// Demo helper: resends the last webhook exactly as Shopify sent it (same body,
// same signature, same webhook ID), the way Shopify does when it retries.
// Run with: npm run replay
const fs = require('fs');

const { headers, body } = JSON.parse(fs.readFileSync('last-webhook.json', 'utf8'));
const PORT = process.env.PORT || 3000;

fetch(`http://localhost:${PORT}/webhooks/orders-create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Hmac-Sha256': headers['x-shopify-hmac-sha256'],
    'X-Shopify-Webhook-Id': headers['x-shopify-webhook-id'],
  },
  body,
}).then((res) => console.log('Resent webhook', headers['x-shopify-webhook-id'], '→ server replied', res.status));
