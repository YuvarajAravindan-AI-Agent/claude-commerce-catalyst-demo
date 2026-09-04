I built a small end-to-end commerce-agent demo on Zoho Catalyst.

A customer says:

“Build me a comfortable home-office setup under ₹25,000.”

The agent then:

→ searches the catalogue
→ verifies product details and prices
→ proposes a multi-item cart
→ creates a Stripe Checkout Session
→ receives the payment webhook
→ shows the complete transaction trace

The interesting part is not the chat bubble. It is the boundary between model reasoning and deterministic commerce operations:

• Claude chooses tools
• Catalyst executes the tools
• The server owns price, stock and payment state
• Stripe confirms the transaction

This is a headless commerce flow with a UI for observability. The same Catalyst APIs can be consumed by another frontend or commerce agent.

Demo/API: https://claude-commerce-demo-60086011005.development.catalystserverless.in/server/commerce/
Source: https://github.com/YuvarajAravindan-AI-Agent/claude-commerce-catalyst-demo

The attached promo shows the complete flow. Mock payment mode is enabled for safe demonstration; no real charge is made.

#Claude #AgenticAI #ZohoCatalyst #Stripe #Ecommerce #Serverless
