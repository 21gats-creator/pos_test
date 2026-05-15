// Supabase Edge Function — Omise PromptPay proxy
// Deploy: supabase functions deploy omise-payment --no-verify-jwt
// Secret: supabase secrets set OMISE_SECRET_KEY=skey_...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OMISE_SECRET_KEY = Deno.env.get('OMISE_SECRET_KEY') ?? '';
const OMISE_CONFIGURED = OMISE_SECRET_KEY.startsWith('skey_') && !OMISE_SECRET_KEY.includes('xxxxxxxx');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url    = new URL(req.url);
  const action = url.searchParams.get('action') ?? '';

  try {
    switch (action) {
      case 'create': return await createCharge(req);
      case 'status': return await checkStatus(url);
      case 'expire': return await expireCharge(req);
      default:       return json({ error: `invalid_action: ${action}` }, 400);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Omise]', msg);
    return json({ error: 'server_error: ' + msg }, 500);
  }
});

async function createCharge(req: Request): Promise<Response> {
  if (!OMISE_CONFIGURED) return json({ error: 'Omise key not configured' }, 503);

  const body         = await req.json();
  const amountBaht   = Number(body.amount ?? 0);
  const amountSatang = Math.round(amountBaht * 100);

  if (amountSatang < 100) return json({ error: `ยอดเงินต้องไม่น้อยกว่า 1 บาท` }, 400);

  const form = new URLSearchParams({
    amount:         String(amountSatang),
    currency:       'thb',
    'source[type]': 'promptpay',
  });

  const res  = await omiseFetch('POST', 'https://api.omise.co/charges', form);
  const data = await res.json();

  if (res.status !== 200 || !data.id) {
    const msg = data.message ?? data.code ?? 'omise_api_error';
    return json({ error: `Omise: ${msg}`, http_code: res.status }, 502);
  }

  const qrUri    = data.source?.scannable_code?.image?.download_uri ?? null;
  const qrBase64 = qrUri ? await downloadQr(qrUri) : null;

  return json({ success: true, charge_id: data.id, status: data.status ?? 'pending', amount: amountBaht, qr_image: qrBase64 });
}

async function checkStatus(url: URL): Promise<Response> {
  if (!OMISE_CONFIGURED) return json({ paid: false, status: 'not_configured' });

  const chargeId = (url.searchParams.get('charge_id') ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!chargeId) return json({ error: 'missing charge_id' }, 400);

  const res    = await omiseFetch('GET', `https://api.omise.co/charges/${chargeId}`);
  const data   = await res.json();
  const status = data.status ?? 'unknown';

  return json({ paid: status === 'successful', status, charge_id: chargeId });
}

async function expireCharge(req: Request): Promise<Response> {
  if (!OMISE_CONFIGURED) return json({ error: 'not_configured' }, 503);

  const body     = await req.json();
  const chargeId = (body.charge_id ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!chargeId) return json({ error: 'missing charge_id' }, 400);

  const res  = await omiseFetch('POST', `https://api.omise.co/charges/${chargeId}/expire`);
  const data = await res.json();

  if (res.status !== 200) return json({ error: `Omise: ${data.message ?? data.code}`, http_code: res.status }, 502);

  return json({ success: true, status: data.status ?? 'expired' });
}

async function omiseFetch(method: string, url: string, body?: URLSearchParams): Promise<Response> {
  const auth = btoa(OMISE_SECRET_KEY + ':');
  return fetch(url, {
    method,
    headers: { Authorization: `Basic ${auth}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    ...(body ? { body: body.toString() } : {}),
  });
}

async function downloadQr(uri: string): Promise<string | null> {
  const auth = btoa(OMISE_SECRET_KEY + ':');
  const res  = await fetch(uri, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) return null;
  const buf  = await res.arrayBuffer();
  const mime = (res.headers.get('content-type') ?? 'image/png').split(';')[0].trim();
  const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:${mime};base64,${b64}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
