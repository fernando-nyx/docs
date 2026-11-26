// Simula avisos da Sellyo contra o servidor local (npm run dev).
// Uso: node scripts/simulate-sellyo.mjs [email] [evento]   (evento padrão: sale_approved)
// Envia o produto principal e um bump como avisos separados, com o mesmo orderId (como a Sellyo faz).
const base = process.env.API || 'http://localhost:8787';
const email = process.argv[2] || 'teste@example.com';
const event = process.argv[3] || 'sale_approved';
const order = 'OrdTeste01';

const send = async (item, paymentId) => {
  const body = {
    event,
    timestamp: new Date().toISOString(),
    payment: { id: `${event}-${paymentId}`, paymentId, status: 'approved', method: 'pix' },
    order: { orderId: order, currency: 'BRL' },
    item,
    customer: { name: 'Teste', email },
  };
  const r = await fetch(`${base}/api/webhooks/sellyo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sellyo-event': event },
    body: JSON.stringify(body),
  });
  console.log(item.name, '→', r.status, await r.text());
};

await send({ name: 'Vice 100%', productId: 'prod-vice100', offer: { code: 'OFFPRINCIPAL', name: 'Guia 100%' } }, 'PayMain01');
await send({ name: 'Rota do Dinheiro', productId: 'prod-dinheiro', offer: { code: 'OFFDINHEIRO', name: 'Bump' } }, 'PayBump01');
