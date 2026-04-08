const ACCESS_TOKEN = 'APP_USR-6143085886954634-040811-9e1e9d23877c55f3de855210a740cdf3-340200184';
const SUPABASE_URL = 'https://taojjnqlggdfvhaetpdg.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhb2pqbnFsZ2dkZnZoYWV0cGRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1MTU1NiwiZXhwIjoyMDkxMjI3NTU2fQ.nzB1GTWpduZ8fiwWH9_yexhIbfqCqzxl4ZOIkZbviRg';

const PACOTES = [
  { msgs: 15000, label: '15.000 mensagens' },
  { msgs: 30000, label: '30.000 mensagens' },
  { msgs: 50000, label: '50.000 mensagens' },
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const body = JSON.parse(event.body);
    if (body.type !== 'payment') return { statusCode: 200, body: 'ok' };

    const paymentId = body.data?.id;
    if (!paymentId) return { statusCode: 200, body: 'ok' };

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    const payment = await resp.json();

    if (payment.status !== 'approved') return { statusCode: 200, body: 'aguardando' };

    const ref = payment.external_reference;
    if (!ref) return { statusCode: 200, body: 'sem referencia' };

    const [clienteId, pacoteIndex] = ref.split('__');
    const pacote = PACOTES[parseInt(pacoteIndex)];
    if (!pacote) return { statusCode: 200, body: 'pacote invalido' };

    const perfilResp = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${clienteId}&select=creditos`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    const perfis = await perfilResp.json();
    const creditosAtuais = perfis[0]?.creditos || 0;
    const novosCreditos = creditosAtuais + pacote.msgs;

    await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${clienteId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ creditos: novosCreditos }),
    });

    await fetch(`${SUPABASE_URL}/rest/v1/transacoes`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cliente_id: clienteId,
        quantidade: pacote.msgs,
        descricao: `Pagamento aprovado MP #${paymentId} — ${pacote.label}`,
      }),
    });

    return { statusCode: 200, body: 'creditos liberados' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
