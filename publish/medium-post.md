# From “I need a desk” to a paid test order: building a visible commerce agent on Zoho Catalyst

Most commerce demos stop at a chatbot recommending products. I wanted to show the part that matters in production: what happens between a customer’s intent and a confirmed payment.

This project is a headless commerce-agent demo hosted on Zoho Catalyst. A customer asks for a bundle in natural language. The agent searches a catalogue, verifies prices, proposes a cart, creates a Stripe Checkout Session, and records a trace for every step.

## The architecture

```text
React / Slate UI
      ↓
Catalyst Advanced I/O function
      ↓
Claude Messages API + tool calls
      ↓
Catalogue → cart → Stripe Checkout
      ↓
Stripe webhook → paid order → trace timeline
```

Catalyst is the execution and data layer: serverless functions, Data Store persistence, environment variables, webhooks and frontend hosting. The agentic behavior comes from the model’s tool-calling loop. Claude can decide which catalogue tools to call, while the server remains authoritative for price, stock and payment state.

## What the demo makes visible

- The customer’s shopping intent
- Tool calls such as `search_products` and `propose_cart`
- Server-verified line items and totals
- Stripe Checkout Session creation
- Webhook confirmation and the final `paid` state

No card data or model chain-of-thought is exposed. For recordings, mock payment mode completes the flow without charging a real card. Stripe test mode can be enabled later with a `sk_test_...` key.

## Try it

- Source: https://github.com/YuvarajAravindan-AI-Agent/claude-commerce-catalyst-demo
- API health / demo endpoint: https://claude-commerce-demo-60086011005.development.catalystserverless.in/server/commerce/
- Promo video: download `promo/claude-commerce-catalyst-promo.mp4` from the repository

The frontend is deployed through Catalyst Slate; its generated `onslate.in` access URL appears in the Slate deployment overview once the build completes.

The useful lesson is simple: an agent should be able to plan, but it should not be trusted with the final price. Keep catalogue truth, checkout creation and payment confirmation behind deterministic server-side tools.

*Built by Yuvaraj Aravindan · AI Agentic Solutions, ERP & Accounting.*
