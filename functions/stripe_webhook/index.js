const crypto = require('node:crypto');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  const parts = Object.fromEntries(signature.split(',').map((item) => item.split('=')));
  const timestamp = Number(parts.t);
  const received = parts.v1;
  if (!timestamp || !received || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST required' });
  const body = await rawBody(req);
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !verifySignature(body.toString('utf8'), req.headers?.['stripe-signature'], secret)) {
    return send(res, 400, { error: 'Invalid Stripe signature' });
  }
  let event;
  try { event = JSON.parse(body.toString('utf8')); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
  const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!supported.includes(event.type)) return send(res, 200, { received: true, ignored: event.type });
  const session = event.data?.object || {};
  const metadata = session.metadata || {};
  if (!metadata.order_id || !metadata.trace_id) return send(res, 200, { received: true, ignored: 'missing metadata' });
  const base = process.env.COMMERCE_API_URL;
  const token = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (!base || !token) return send(res, 500, { error: 'COMMERCE_API_URL and INTERNAL_WEBHOOK_TOKEN are required' });
  const response = await fetch(`${base.replace(/\/$/, '')}/internal/stripe-confirm`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-token': token },
    body: JSON.stringify({ order_id: metadata.order_id, trace_id: metadata.trace_id, stripe_session_id: session.id, event_id: event.id })
  });
  if (!response.ok) return send(res, 502, { error: 'Commerce confirmation failed', status: response.status });
  return send(res, 200, { received: true, order_id: metadata.order_id, status: 'paid' });
};
