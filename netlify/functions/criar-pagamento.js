const ACCESS_TOKEN = 'APP_USR-6143085886954634-040811-9e1e9d23877c55f3de855210a740cdf3-340200184';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { pacote_index, cliente_id, cliente_email, cliente_cpf } = JSON.parse(event.body);

    const PACOTES = [
      { msgs: 15000, preco: 6750,  label: '15.000 mensagens — Lead IT' },
      { msgs: 30000, preco: 13500, label: '30.000 mensagens — Lead IT' },
      { msgs: 50000, preco: 22500, label: '50.000 mensagens — Lead IT' },
    ];

    const pacote = PACOTES[pacote_index];
    if (!pacote) return { statusCode: 400, body: 'Pacote inválido' };

    const body = {
      transaction_amount: pacote.preco,
      description: pacote.label,
      payment_method_id: 'pix',
      payer: {
        email: cliente_email,
        first_name: 'Cliente',
        last_name: 'LeadIT',
        identification: {
          type: 'CPF',
          number: cliente_cpf || '00000000000',
        },
      },
      external_reference: `${cliente_id}__${pacote_index}__${Date.now()}`,
      notification_url: 'https://leadit-company.netlify.app/.netlify/functions/webhook-pagamento',
    };

    console.log('Criando PIX para:', cliente_email, 'valor:', pacote.preco);

    const resp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': `${cliente_id}-${pacote_index}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    console.log('Resposta MP:', resp.status, data.status, data.error || '');

    if (!resp.ok || data.error) {
      console.error('Erro MP:', JSON.stringify(data));
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ erro: data.message || data.error || 'Erro ao gerar PIX' }),
      };
    }

    const qr = data.point_of_interaction?.transaction_data;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        payment_id: data.id,
        status: data.status,
        qr_code: qr?.qr_code,
        qr_code_base64: qr?.qr_code_base64,
        external_reference: body.external_reference,
      }),
    };

  } catch (err) {
    console.error('Excecao:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ erro: err.message }),
    };
  }
};
