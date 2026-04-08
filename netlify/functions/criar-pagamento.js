const ACCESS_TOKEN = 'APP_USR-6143085886954634-040811-9e1e9d23877c55f3de855210a740cdf3-340200184';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { pacote_index, cliente_id, cliente_email } = JSON.parse(event.body);

    const PACOTES = [
      { msgs: 15000, preco: 675000, label: '15.000 mensagens — Lead IT' },
      { msgs: 30000, preco: 1350000, label: '30.000 mensagens — Lead IT' },
      { msgs: 50000, preco: 2250000, label: '50.000 mensagens — Lead IT' },
    ];

    const pacote = PACOTES[pacote_index];
    if (!pacote) return { statusCode: 400, body: 'Pacote inválido' };

    const body = {
      items: [{
        title: pacote.label,
        quantity: 1,
        unit_price: pacote.preco / 100,
        currency_id: 'BRL',
      }],
      payer: { email: cliente_email },
      payment_methods: { excluded_payment_types: [], default_payment_method_id: 'pix' },
      back_urls: {
        success: `https://leadit-company.netlify.app?pagamento=sucesso&cliente=${cliente_id}&pacote=${pacote_index}`,
        failure: `https://leadit-company.netlify.app?pagamento=erro`,
        pending: `https://leadit-company.netlify.app?pagamento=pendente`,
      },
      auto_return: 'approved',
      external_reference: `${cliente_id}__${pacote_index}__${Date.now()}`,
      statement_descriptor: 'LEADIT DISPAROS',
    };

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { statusCode: 500, body: JSON.stringify({ erro: data }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        init_point: data.init_point,
        preference_id: data.id,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ erro: err.message }) };
  }
};
