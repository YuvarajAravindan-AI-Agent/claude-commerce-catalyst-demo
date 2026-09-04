'use strict';

const crypto = require('crypto');
const catalyst = require('zcatalyst-sdk-node');

const PRODUCTS = [
  { product_id: 'desk-pro', name: 'LiftDesk Pro', description: 'Electric standing desk with memory presets.', category: 'desk', price_minor: 1899900, currency: 'INR', stock_qty: 8, active: true, image_url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6b7?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'chair-flex', name: 'AeroFlex Chair', description: 'Breathable ergonomic chair with adjustable lumbar support.', category: 'chair', price_minor: 749900, currency: 'INR', stock_qty: 14, active: true, image_url: 'https://images.unsplash.com/photo-1505843490701-5be5d2f9a1c1?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'lamp-focus', name: 'FocusBeam Lamp', description: 'Glare-free desk lamp with warm and cool modes.', category: 'lighting', price_minor: 249900, currency: 'INR', stock_qty: 21, active: true, image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'monitor-27', name: 'ClearView 27', description: '27-inch 4K monitor with USB-C connectivity.', category: 'monitor', price_minor: 3299900, currency: 'INR', stock_qty: 5, active: true, image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'stand-mat', name: 'Balance Mat', description: 'Anti-fatigue mat for standing desk sessions.', category: 'accessories', price_minor: 89900, currency: 'INR', stock_qty: 30, active: true, image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'hub-usbc', name: 'PortHub USB-C', description: 'Compact USB-C hub with HDMI, Ethernet and card reader.', category: 'accessories', price_minor: 399900, currency: 'INR', stock_qty: 12, active: true, image_url: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'headset-clear', name: 'ClearCall Headset', description: 'Noise-reducing headset for focused calls.', category: 'audio', price_minor: 599900, currency: 'INR', stock_qty: 9, active: true, image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80' },
  { product_id: 'cable-kit', name: 'CableCalm Kit', description: 'Desk cable-management kit with clips and sleeves.', category: 'accessories', price_minor: 49900, currency: 'INR', stock_qty: 42, active: true, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80' },
];

const memory = { products: PRODUCTS.map((p) => ({ ...p })), sessions: new Map(), orders: new Map(), events: [] };

function json(res, status, body, extraHeaders = {}) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders }); res.end(JSON.stringify(body)); }
function corsHeaders() { return { 'Access-Control-Allow-Origin': process.env.ALLOWED_FRONTEND_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Internal-Token', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }; }
async function readBody(req) { return await new Promise((resolve, reject) => { let body = ''; req.on('data', (chunk) => { body += chunk; if (body.length > 1_000_000) reject(new Error('request too large')); }); req.on('end', () => resolve(body)); req.on('error', reject); }); }
async function readJson(req) { const body = await readBody(req); if (!body) return {}; try { return JSON.parse(body); } catch { throw new Error('invalid JSON body'); } }
function useDataStore(req) { return process.env.CATALYST_DATASTORE_ENABLED === 'true' && req; }
function dataStore(req) { return catalyst.initialize(req, { scope: 'admin' }).datastore(); }

async function rows(req, tableName) {
  if (!useDataStore(req)) {
    if (tableName === 'Products') return memory.products;
    if (tableName === 'ShoppingSessions') return [...memory.sessions.values()];
    if (tableName === 'Orders') return [...memory.orders.values()];
    return memory.events;
  }
  const result = await dataStore(req).table(tableName).getPagedRows({ maxRows: 300 });
  return (result.data || []).map((row) => row[tableName] || row);
}

async function insert(req, tableName, value) {
  if (!useDataStore(req)) {
    if (tableName === 'Products') memory.products.push(value);
    else if (tableName === 'ShoppingSessions') memory.sessions.set(value.session_id, value);
    else if (tableName === 'Orders') memory.orders.set(value.order_id, value);
    else memory.events.push(value);
    return value;
  }
  return await dataStore(req).table(tableName).insertRow(value);
}

async function updateBy(req, tableName, key, value, patch) {
  if (!value) throw new Error(`${tableName} row not found`);
  if (!useDataStore(req)) { Object.assign(value, patch); return value; }
  const list = await rows(req, tableName); const found = list.find((row) => row[key] === value[key]);
  if (!found || !found.ROWID) throw new Error(`${tableName} row not found`);
  return await dataStore(req).table(tableName).updateRow({ ROWID: found.ROWID, ...patch });
}

async function findBy(req, tableName, key, value) { return (await rows(req, tableName)).find((row) => row[key] === value) || null; }
async function listProducts(req) { const list = await rows(req, 'Products'); if (useDataStore(req) && list.length === 0) { for (const product of PRODUCTS) await insert(req, 'Products', product); return PRODUCTS; } return list; }
function traceId() { return `tr_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`; }
function orderId() { return `ord_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`; }
function sessionId() { return `sess_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`; }
function now() { return new Date().toISOString(); }
function money(minor, currency = 'INR') { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(minor / 100); }

async function event(req, trace, type, source, status, summary, payload = {}, durationMs = null) {
  const existing = (await rows(req, 'TraceEvents')).filter((item) => item.trace_id === trace);
  const record = { trace_id: trace, sequence_no: existing.length + 1, event_type: type, source, status, summary: String(summary).slice(0, 500), safe_payload_json: JSON.stringify(payload).slice(0, 4000), duration_ms: durationMs, created_at_iso: now() };
  await insert(req, 'TraceEvents', record); return record;
}

async function createSession(req) {
  const session = { session_id: sessionId(), trace_id: traceId(), status: 'active', cart_json: '[]', messages_json: '[]', created_at_iso: now(), updated_at_iso: now() };
  await insert(req, 'ShoppingSessions', session); await event(req, session.trace_id, 'customer_session_created', 'commerce_api', 'completed', 'New shopping session created', { trace_id: session.trace_id }); return session;
}
async function getSession(req, id) { return await findBy(req, 'ShoppingSessions', 'session_id', id); }
async function getOrder(req, id) { return await findBy(req, 'Orders', 'order_id', id); }

async function searchProducts(req, input) {
  const query = String(input.query || '').toLowerCase(); const max = Number.isFinite(Number(input.max_price_minor)) ? Number(input.max_price_minor) : Infinity; const terms = query.split(/\s+/).filter(Boolean);
  const products = (await listProducts(req)).filter((p) => p.active !== false && Number(p.price_minor) <= max);
  return products.map((product) => ({ product, score: terms.reduce((score, term) => score + (`${product.name} ${product.description} ${product.category}`).toLowerCase().includes(term) ? 1 : 0, 0) })).sort((a, b) => b.score - a.score || a.product.price_minor - b.product.price_minor).slice(0, Math.min(Number(input.limit) || 6, 12)).map(({ product }) => product);
}

async function proposeCart(req, session, lines) {
  const products = await listProducts(req); const normalized = [];
  for (const line of Array.isArray(lines) ? lines : []) { const product = products.find((item) => item.product_id === line.product_id && item.active !== false); const quantity = Math.max(1, Math.min(5, Number(line.quantity) || 1)); if (product && product.stock_qty >= quantity) normalized.push({ product_id: product.product_id, name: product.name, quantity, unit_price_minor: Number(product.price_minor), currency: product.currency || 'INR' }); }
  if (!normalized.length) throw new Error('No available products were selected');
  const total = normalized.reduce((sum, line) => sum + line.unit_price_minor * line.quantity, 0); if (total > Number(process.env.MAX_ORDER_AMOUNT_MINOR || 10_000_000)) throw new Error('Cart exceeds the configured maximum');
  await updateBy(req, 'ShoppingSessions', 'session_id', session, { cart_json: JSON.stringify(normalized), status: 'cart_proposed', updated_at_iso: now() });
  await event(req, session.trace_id, 'cart_proposed', 'commerce_api', 'completed', `Cart proposed at ${money(total)}`, { item_count: normalized.length, total_minor: total, currency: 'INR' }); return { lines: normalized, total_minor: total, currency: 'INR' };
}

const tools = [
  { name: 'search_products', description: 'Search the active catalogue. Prices and stock come from the server.', input_schema: { type: 'object', properties: { query: { type: 'string' }, max_price_minor: { type: 'number' }, limit: { type: 'number' } }, required: ['query'] } },
  { name: 'get_product_details', description: 'Get authoritative details for products returned by search.', input_schema: { type: 'object', properties: { product_ids: { type: 'array', items: { type: 'string' } } }, required: ['product_ids'] } },
  { name: 'propose_cart', description: 'Propose a cart from server-returned product IDs. This does not charge or create checkout.', input_schema: { type: 'object', properties: { lines: { type: 'array', items: { type: 'object', properties: { product_id: { type: 'string' }, quantity: { type: 'number' } }, required: ['product_id'] } } }, required: ['lines'] } },
];
async function executeTool(req, session, name, input) { if (name === 'search_products') return { products: await searchProducts(req, input) }; if (name === 'get_product_details') return { products: (await listProducts(req)).filter((product) => (input.product_ids || []).includes(product.product_id)) }; if (name === 'propose_cart') return await proposeCart(req, session, input.lines); throw new Error(`Unknown tool: ${name}`); }

async function localAgent(req, session, prompt) {
  const products = await searchProducts(req, { query: prompt, limit: 6 }); const selected = products.slice(0, 3); const cart = await proposeCart(req, session, selected.map((product) => ({ product_id: product.product_id, quantity: 1 })));
  await event(req, session.trace_id, 'catalog_search_completed', 'catalogue', 'completed', `${products.length} catalogue matches returned`, { result_count: products.length }); return { assistant: `I found ${products.length} good options. I selected a balanced starter bundle and kept the total at ${money(cart.total_minor)}. Review it, then confirm the cart to continue to secure checkout.`, recommendations: products, cart };
}

async function anthropicAgent(req, session, prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY; if (!apiKey) return await localAgent(req, session, prompt);
  let messages; try { messages = JSON.parse(session.messages_json || '[]'); } catch { messages = []; } messages.push({ role: 'user', content: prompt }); let finalText = ''; let recommendations = []; let cart = null;
  for (let turn = 0; turn < 5; turn += 1) {
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5', max_tokens: 900, system: 'You are a trustworthy shopping assistant. Use tools for every catalogue fact. Recommend at most six items. Never invent prices, availability or payment status. Propose a cart only after considering the customer request. Checkout and payment are handled by the host.', tools, messages }) });
    if (!response.ok) throw new Error(`Anthropic request failed (${response.status})`); const data = await response.json(); const blocks = data.content || []; finalText = blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n'); const calls = blocks.filter((block) => block.type === 'tool_use'); messages.push({ role: 'assistant', content: blocks }); if (!calls.length) break;
    const results = []; for (const call of calls) { const started = Date.now(); await event(req, session.trace_id, `${call.name}_started`, 'claude', 'started', `Claude called ${call.name}`); try { const result = await executeTool(req, session, call.name, call.input || {}); if (result.products) recommendations = result.products; if (result.lines) cart = result; results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result) }); await event(req, session.trace_id, `${call.name}_completed`, 'commerce_api', 'completed', `${call.name} completed`, { duration_ms: Date.now() - started }); } catch (error) { results.push({ type: 'tool_result', tool_use_id: call.id, is_error: true, content: error.message }); await event(req, session.trace_id, `${call.name}_failed`, 'commerce_api', 'failed', `${call.name} failed`); } }
    messages.push({ role: 'user', content: results });
  }
  await updateBy(req, 'ShoppingSessions', 'session_id', session, { messages_json: JSON.stringify(messages).slice(-12000), updated_at_iso: now() }); return { assistant: finalText || 'I found a few suitable options. Review the recommendations below.', recommendations, cart };
}

function origin(req) { const proto = req.headers['x-forwarded-proto'] || 'https'; const host = req.headers.host || 'localhost:9000'; return `${proto}://${host}`; }
async function createCheckout(req, session) {
  if (session.status !== 'confirmed') throw new Error('Confirm the cart before checkout'); const cart = JSON.parse(session.cart_json || '[]'); const products = await listProducts(req); const checked = cart.map((line) => { const product = products.find((item) => item.product_id === line.product_id); if (!product || product.stock_qty < line.quantity) throw new Error(`${line.name} is no longer available`); return { ...line, name: product.name, unit_price_minor: Number(product.price_minor), currency: product.currency || 'INR' }; }); const total = checked.reduce((sum, line) => sum + line.unit_price_minor * line.quantity, 0); const oid = orderId(); const order = { order_id: oid, session_id: session.session_id, trace_id: session.trace_id, amount_minor: total, currency: 'INR', status: 'awaiting_payment', stripe_checkout_session_id: '', created_at_iso: now(), updated_at_iso: now() }; await insert(req, 'Orders', order); await updateBy(req, 'ShoppingSessions', 'session_id', session, { cart_json: JSON.stringify(checked), status: 'checkout_created', updated_at_iso: now() }); await event(req, session.trace_id, 'prices_revalidated', 'commerce_api', 'completed', `Server revalidated ${money(total)}`, { amount_minor: total, currency: 'INR' });
  if (!process.env.STRIPE_SECRET_KEY) { if (process.env.DEMO_MOCK_PAYMENTS !== 'true') throw new Error('STRIPE_SECRET_KEY is not configured'); const checkoutUrl = `${origin(req)}/?mock_checkout=1&session_id=${encodeURIComponent(session.session_id)}&trace_id=${encodeURIComponent(session.trace_id)}`; await updateBy(req, 'Orders', 'order_id', order, { stripe_checkout_session_id: `cs_test_mock_${session.trace_id}`, updated_at_iso: now() }); await event(req, session.trace_id, 'checkout_session_created', 'commerce_api', 'completed', 'Mock Stripe Test Checkout created', { order_id: oid, stripe_mode: 'test', mock: true }); return { order_id: oid, checkout_url: checkoutUrl, mock: true, amount_minor: total, currency: 'INR' }; }
  const form = new URLSearchParams(); form.set('mode', 'payment'); form.set('client_reference_id', oid); form.set('success_url', process.env.STRIPE_SUCCESS_URL || `${origin(req)}/?payment=success&session_id={CHECKOUT_SESSION_ID}&trace_id=${session.trace_id}`); form.set('cancel_url', process.env.STRIPE_CANCEL_URL || `${origin(req)}/?payment=cancelled&trace_id=${session.trace_id}`); form.set('metadata[order_id]', oid); form.set('metadata[session_id]', session.session_id); form.set('metadata[trace_id]', session.trace_id); checked.forEach((line, index) => { form.set(`line_items[${index}][price_data][currency]`, 'inr'); form.set(`line_items[${index}][price_data][unit_amount]`, String(line.unit_price_minor)); form.set(`line_items[${index}][price_data][product_data][name]`, line.name); form.set(`line_items[${index}][quantity]`, String(line.quantity)); });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form }); const stripe = await response.json(); if (!response.ok) throw new Error(stripe.error?.message || 'Stripe Checkout creation failed'); await updateBy(req, 'Orders', 'order_id', order, { stripe_checkout_session_id: stripe.id, updated_at_iso: now() }); await event(req, session.trace_id, 'checkout_session_created', 'commerce_api', 'completed', 'Stripe Test Checkout created', { order_id: oid, stripe_mode: 'test', session_id_suffix: String(stripe.id).slice(-8) }); return { order_id: oid, checkout_url: stripe.url, stripe_session_id_suffix: String(stripe.id).slice(-8), amount_minor: total, currency: 'INR' };
}

async function markPaid(req, order, source = 'stripe_webhook') { if (!order) throw new Error('Order not found'); if (order.status === 'paid') return order; await updateBy(req, 'Orders', 'order_id', order, { status: 'paid', updated_at_iso: now() }); const session = await getSession(req, order.session_id); if (session) await updateBy(req, 'ShoppingSessions', 'session_id', session, { status: 'paid', updated_at_iso: now() }); await event(req, order.trace_id, 'order_marked_paid', source, 'completed', 'Payment verified and order marked paid', { order_id: order.order_id, amount_minor: order.amount_minor, currency: order.currency }); return { ...order, status: 'paid' }; }

async function route(req, res) {
  const headers = corsHeaders(); if (req.method === 'OPTIONS') return json(res, 204, {}, headers); const url = new URL(req.url || '/', 'http://localhost'); const path = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (req.method === 'GET' && path === '/') return json(res, 200, { ok: true, service: 'claude-commerce-demo', stripe_test_mode: true }, headers);
    if (req.method === 'GET' && path === '/health') return json(res, 200, { ok: true, timestamp: now(), datastore: !!useDataStore(req) }, headers);
    if (req.method === 'POST' && path === '/sessions') return json(res, 201, await createSession(req), headers);
    const sessionMatch = path.match(/^\/sessions\/([^/]+)$/); const chatMatch = path.match(/^\/sessions\/([^/]+)\/chat$/); const confirmMatch = path.match(/^\/sessions\/([^/]+)\/cart\/confirm$/); const checkoutMatch = path.match(/^\/sessions\/([^/]+)\/checkout$/); const demoPayMatch = path.match(/^\/sessions\/([^/]+)\/demo-pay$/);
    if (req.method === 'GET' && sessionMatch) { const session = await getSession(req, decodeURIComponent(sessionMatch[1])); if (!session) return json(res, 404, { error: 'session not found' }, headers); return json(res, 200, { ...session, cart: JSON.parse(session.cart_json || '[]'), events: (await rows(req, 'TraceEvents')).filter((item) => item.trace_id === session.trace_id) }, headers); }
    if (req.method === 'POST' && chatMatch) { const session = await getSession(req, decodeURIComponent(chatMatch[1])); if (!session) return json(res, 404, { error: 'session not found' }, headers); const body = await readJson(req); const prompt = String(body.prompt || '').trim(); if (!prompt) return json(res, 400, { error: 'prompt is required' }, headers); await event(req, session.trace_id, 'customer_request_received', 'demo_ui', 'completed', 'Customer request received', { prompt_length: prompt.length }); const started = Date.now(); const result = await anthropicAgent(req, session, prompt); await event(req, session.trace_id, 'claude_turn_completed', 'claude', 'completed', 'Shopping turn completed', { duration_ms: Date.now() - started }, Date.now() - started); return json(res, 200, { trace_id: session.trace_id, session_id: session.session_id, ...result, events: (await rows(req, 'TraceEvents')).filter((item) => item.trace_id === session.trace_id) }, headers); }
    if (req.method === 'POST' && confirmMatch) { const session = await getSession(req, decodeURIComponent(confirmMatch[1])); if (!session) return json(res, 404, { error: 'session not found' }, headers); if (session.status !== 'cart_proposed') return json(res, 409, { error: 'no cart proposal is awaiting confirmation' }, headers); await updateBy(req, 'ShoppingSessions', 'session_id', session, { status: 'confirmed', updated_at_iso: now() }); await event(req, session.trace_id, 'customer_confirmation_received', 'demo_ui', 'completed', 'Customer confirmed the proposed cart'); return json(res, 200, { ok: true, status: 'confirmed', trace_id: session.trace_id }, headers); }
    if (req.method === 'POST' && checkoutMatch) { const session = await getSession(req, decodeURIComponent(checkoutMatch[1])); if (!session) return json(res, 404, { error: 'session not found' }, headers); return json(res, 200, { ...(await createCheckout(req, session)), trace_id: session.trace_id }, headers); }
    if (req.method === 'POST' && demoPayMatch) { if (process.env.DEMO_MOCK_PAYMENTS !== 'true') return json(res, 404, { error: 'mock payments disabled' }, headers); const session = await getSession(req, decodeURIComponent(demoPayMatch[1])); const order = session && (await rows(req, 'Orders')).find((item) => item.session_id === session.session_id); await markPaid(req, order, 'demo_payment'); return json(res, 200, { ok: true, status: 'paid', trace_id: session.trace_id }, headers); }
    if (req.method === 'POST' && path === '/internal/stripe-confirm') { if (process.env.INTERNAL_WEBHOOK_TOKEN && req.headers['x-internal-token'] !== process.env.INTERNAL_WEBHOOK_TOKEN) return json(res, 401, { error: 'unauthorized' }, headers); const body = await readJson(req); await markPaid(req, await getOrder(req, body.order_id)); return json(res, 200, { ok: true }, headers); }
    if (req.method === 'GET' && path.startsWith('/transactions/')) { const trace = decodeURIComponent(path.split('/')[2]); const items = (await rows(req, 'TraceEvents')).filter((item) => item.trace_id === trace).sort((a, b) => a.sequence_no - b.sequence_no); return json(res, 200, { trace_id: trace, events: items }, headers); }
    return json(res, 404, { error: 'not found' }, headers);
  } catch (error) { return json(res, 400, { error: error.message || 'request failed' }, headers); }
}

module.exports = (req, res) => route(req, res);
