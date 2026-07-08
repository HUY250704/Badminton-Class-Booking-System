import crypto from 'crypto';

const PAYOS_API_URL = process.env.PAYOS_API_URL || 'https://api-merchant.payos.vn';

function sortedDataString(data) {
  return Object.keys(data)
    .sort()
    .map((key) => {
      let value = data[key];
      if (value === undefined || value === null || value === 'undefined' || value === 'null') {
        value = '';
      }
      if (Array.isArray(value)) {
        value = JSON.stringify(value.map((item) => {
          if (!item || typeof item !== 'object') return item;
          return Object.keys(item).sort().reduce((result, itemKey) => {
            result[itemKey] = item[itemKey];
            return result;
          }, {});
        }));
      }
      return `${key}=${value}`;
    })
    .join('&');
}

function signPayosData(data) {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) return '';
  return crypto.createHmac('sha256', checksumKey).update(sortedDataString(data)).digest('hex');
}

function configured() {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

function payosHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': process.env.PAYOS_CLIENT_ID,
    'x-api-key': process.env.PAYOS_API_KEY
  };
}

export function isPayosConfigured() {
  return configured();
}

export function verifyPayosSignature(data, signature) {
  if (!process.env.PAYOS_CHECKSUM_KEY || !signature || !data) return false;
  const expected = signPayosData(data);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function createPayosPaymentLink({ amount, orderCode, description, buyerName, buyerEmail, itemName }) {
  if (!configured()) return null;

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
  const payload = {
    orderCode,
    amount: Math.round(Number(amount)),
    description: String(description || `CLASS${String(orderCode).slice(-4)}`).slice(0, 25),
    buyerName,
    buyerEmail,
    items: [
      {
        name: String(itemName || 'Badminton class').slice(0, 100),
        quantity: 1,
        price: Math.round(Number(amount))
      }
    ],
    cancelUrl: `${clientUrl}/payments?orderCode=${orderCode}&status=cancelled`,
    returnUrl: `${apiBaseUrl}/api/payments/payos-return`
  };
  payload.signature = signPayosData({
    amount: payload.amount,
    cancelUrl: payload.cancelUrl,
    description: payload.description,
    orderCode: payload.orderCode,
    returnUrl: payload.returnUrl
  });

  const response = await fetch(`${PAYOS_API_URL}/v2/payment-requests`, {
    method: 'POST',
    headers: payosHeaders(),
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.code !== '00') {
    throw new Error(result.desc || result.message || 'Could not create PayOS payment link');
  }

  return result.data;
}

export async function getPayosPaymentRequest(orderCode) {
  if (!configured()) return null;

  const response = await fetch(`${PAYOS_API_URL}/v2/payment-requests/${orderCode}`, {
    headers: payosHeaders()
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.code !== '00') {
    throw new Error(result.desc || result.message || 'Could not get PayOS payment status');
  }

  return result.data;
}
