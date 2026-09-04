# Claude Commerce Transaction Lab

Headless commerce demo on Zoho Catalyst. A shopping request becomes a tool-driven cart, a Stripe Checkout Session, and an observable transaction trace. It is safe to demo without secrets using the in-memory catalogue and `DEMO_MOCK_PAYMENTS=true`.

## Local run

```bash
cd commerce-demo-ui && npm run dev
```

The UI expects the deployed/local `commerce` function at `VITE_COMMERCE_API_URL` (default `/server/commerce`). For real Claude and Stripe test mode, configure the variables in `.env.example` as Catalyst function environment variables. Never commit keys.

## Catalyst

```bash
catalyst serve
catalyst deploy
```

Create Data Store tables `Products`, `ShoppingSessions`, `Orders`, and `TraceEvents`, then set `CATALYST_DATASTORE_ENABLED=true` to persist traces. Stripe CLI can forward test webhooks to the `stripe_webhook` function; set `COMMERCE_API_URL` and `INTERNAL_WEBHOOK_TOKEN` for confirmation.

The UI intentionally exposes event summaries, IDs and statuses—not model chain-of-thought or payment secrets.
