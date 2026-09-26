# Shopify order → SMS text

A stripped-down version of what [Postscript](https://postscript.io) does: when something happens in a Shopify store, send an SMS about it. Here, when a new order is placed, Shopify sends it to this server as a webhook. The server checks that it really came from Shopify, then sends me a text through Twilio.

I built this with help from Claude Code and learned a lot along the way, mainly about webhooks, verifying them with HMAC signatures, and sending texts with Twilio.

## How it works

```
Order placed in Shopify
  → Shopify sends the order (webhook) to /webhooks/orders-create
  → Server checks the HMAC signature (rejects with 401 if it doesn't match)
  → Server replies 200 so Shopify knows it arrived
  → Server sends a text through Twilio
```

All the code is in [`server.js`](server.js), with comments explaining each step.

## Setup

You'll need Node.js, a Shopify store (a development store works), and a Twilio account.

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `SHOPIFY_WEBHOOK_SECRET`: shown in Shopify admin under **Settings → Notifications → Webhooks** ("Your webhooks will be signed with…")
   - `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`: from the Twilio Console home page
   - `TWILIO_FROM_NUMBER`: your Twilio phone number, e.g. `+15551234567`
   - `SMS_TO_NUMBER`: the phone that should receive the texts
   - `TWILIO_TRIAL_TEMPLATE`: the Twilio template to send, e.g. `sms_order_confirmation`
3. Start the server:
   ```
   npm start
   ```
4. Shopify can't reach `localhost`, so expose the server with a tunnel:
   ```
   cloudflared tunnel --url http://localhost:3000
   ```
5. In Shopify admin, go to **Settings → Notifications → Webhooks → Create webhook**. Choose **Order creation**, format **JSON**, and set the URL to `https://<your-tunnel-url>/webhooks/orders-create`.
6. Place an order (or click **Send test**), and a text should arrive.

## Notes

- **Twilio trial accounts** can only send Twilio's built-in message templates, not custom text. That's why the message body is a template name from `TWILIO_TRIAL_TEMPLATE` and the text uses Twilio's own wording. They can also only text phone numbers you've verified in the Twilio Console.
- The free tunnel URL changes every time `cloudflared` restarts. When it does, update the webhook URL in Shopify.

## What I'd add next

- **Real order details in the text** (order number, total, items), once the Twilio account is upgraded.
- **Skipping duplicates.** Shopify can deliver the same webhook more than once; each has an `X-Shopify-Webhook-Id` that could be tracked.
- **Error handling and logging** around the Twilio call.
- **Hosting it somewhere permanent** instead of running it on a laptop through a tunnel.
