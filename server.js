// A stripped-down Postscript: when a Shopify order is placed, send an SMS through Twilio.
// Built with help from Claude Code. Secrets are read from .env (see .env.example).

// crypto checks Shopify's signature, express runs the web server, twilio sends texts,
// fs saves the last webhook to a file so replay.js can resend it.
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Log in to Twilio with my account credentials from .env.
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Webhook IDs we've already handled, so a repeat delivery doesn't send a second text.
const handledWebhookIds = new Set();

// Health check: shows "ok" in a browser to confirm the server and tunnel are up.
app.get('/', (req, res) => {
  res.send('ok');
});

// Shopify sends each new order here. express.raw() keeps the exact bytes Shopify
// sent, because the signature check below only works on the untouched data.
app.post('/webhooks/orders-create', express.raw({ type: 'application/json' }), async (req, res) => {
  // Step 1: prove it's really Shopify. Recreate the signature with our shared secret
  // and compare it to the one Shopify sent; reject with 401 if they don't match.
  const hmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(req.body)
    .digest('base64');

  if (hmac !== req.get('X-Shopify-Hmac-Sha256')) {
    return res.sendStatus(401);
  }

  // Step 2: reply 200 right away. Shopify retries if it doesn't hear back within 5 seconds.
  res.sendStatus(200);

  // Step 3: skip duplicates. Shopify can deliver the same webhook more than once
  // (e.g. a retry), and every delivery of it has the same X-Shopify-Webhook-Id.
  const webhookId = req.get('X-Shopify-Webhook-Id');
  if (handledWebhookIds.has(webhookId)) {
    console.log('Duplicate webhook, skipping:', webhookId);
    return;
  }
  handledWebhookIds.add(webhookId);

  // Save this webhook (headers + body) so replay.js can resend it for the demo.
  fs.writeFileSync('last-webhook.json', JSON.stringify({ headers: req.headers, body: req.body.toString() }));

  // Step 4: read the order and log its number
  const order = JSON.parse(req.body);
  console.log('New order:', order.name, '| webhook ID:', webhookId);

  // Step 5: text me. Twilio trial accounts only allow built-in templates, so we send
  // the template name from .env (e.g. sms_order_confirmation) instead of custom text.
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to: process.env.SMS_TO_NUMBER,
    body: process.env.TWILIO_TRIAL_TEMPLATE,
  });
});

// Start the server.
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
