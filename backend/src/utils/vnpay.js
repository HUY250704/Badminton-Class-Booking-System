import crypto from 'crypto';

function sortObject(input) {
  return Object.keys(input)
    .sort()
    .reduce((result, key) => {
      result[key] = input[key];
      return result;
    }, {});
}

function formatVnpDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

export function createVnpayCheckoutUrl({ amount, orderId, orderInfo, ipAddr }) {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secret = process.env.VNPAY_HASH_SECRET;
  const gatewayUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNPAY_RETURN_URL || `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/payments/vnpay-return`;

  if (!tmnCode || !secret) {
    return '';
  }

  const params = sortObject({
    vnp_Amount: Math.round(amount * 100),
    vnp_Command: 'pay',
    vnp_CreateDate: formatVnpDate(new Date()),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'billpayment',
    vnp_ReturnUrl: returnUrl,
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: orderId,
    vnp_Version: '2.1.0'
  });

  const signData = new URLSearchParams(params).toString();
  const secureHash = crypto.createHmac('sha512', secret).update(signData).digest('hex');
  return `${gatewayUrl}?${signData}&vnp_SecureHash=${secureHash}`;
}

export function verifyVnpayReturn(query) {
  const secret = process.env.VNPAY_HASH_SECRET;
  if (!secret) return false;

  const providedHash = query.vnp_SecureHash;
  if (!providedHash) return false;

  const signedParams = { ...query };
  delete signedParams.vnp_SecureHash;
  delete signedParams.vnp_SecureHashType;

  const signData = new URLSearchParams(sortObject(signedParams)).toString();
  const expectedHash = crypto.createHmac('sha512', secret).update(signData).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(providedHash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}
