const ACCESS_TOKEN = 'APP_USR-6143085886954634-040811-9e1e9d23877c55f3de855210a740cdf3-340200184';
const SUPABASE_URL = 'https://taojjnqlggdfvhaetpdg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhb2pqbnFsZ2dkZnZoYWV0cGRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1MTU1NiwiZXhwIjoyMDkxMjI3NTU2fQ.nzB1GTWpduZ8fiwWH9_yexhIbfqCqzxl4ZOIkZbviRg';
const PACOTES = [{ msgs: 15000 }, { msgs: 30000 }, { msgs: 50000 }];

exports.handler = async (event) => {
  const paymentId = event.queryStringParameters?.id;
  if (!paymentId) return { statusCode: 400, body: 'ID obrigatório' };

  try {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` },
    });
    const payment = await resp.json();

    if (payment.status === 'approved') {
      const ref = payment.external_reference || '';
      const [clienteId, pacoteIndex] = ref.split('__');
      const pacote = PACOTES[parseInt(pacoteIndex)];

      if (clienteId && pacote) {
        const h = {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        };
        const pr = await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${clienteId}&select=creditos`, { headers: h });
        const perfis = await pr.json();
        const atual = perfis[0]?.creditos || 0;

        await fetch(`${SUPABASE_URL}/rest/v1/perfis?id=eq.${clienteId}`, {
          method: 'PATCH', headers: h,
          body: JSON.stringify({ creditos: atual + pacote.msgs }),
        });
        await fetch(`${SUPABASE_URL}/rest/v1/transacoes`, {
          method: 'POST', headers: h,
          body: JSON.stringify({ cliente_id: clienteId, quantidade: pacote.msgs, descricao: `PIX aprovado #${paymentId}` }),
        });
        console.log('Créditos liberados:', pacote.msgs, 'para cliente:', clienteId);
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: payment.status }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ erro: err.message }) };
  }
};
