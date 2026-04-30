function buildBaseApiUrl(req) {
  const explicit = process.env.PAYMENT_NOTIFY_BASE_URL || process.env.BACKEND_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

function getPaymentConfig() {
  return {
    defaultProvider: (process.env.PAYMENT_PROVIDER_DEFAULT || 'alipay').toLowerCase(),
    supportedProviders: ['mock', 'alipay', 'wechat'],
    mockEnabled: (process.env.PAYMENT_MOCK_ENABLED || 'true') !== 'false',
    frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5173',
    alipay: {
      enabled: (process.env.ALIPAY_ENABLED || 'false') === 'true',
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || ''
    },
    wechat: {
      enabled: (process.env.WECHAT_PAY_ENABLED || 'false') === 'true',
      mchid: process.env.WECHAT_PAY_MCHID || '',
      appid: process.env.WECHAT_PAY_APPID || '',
      serialNo: process.env.WECHAT_PAY_SERIAL_NO || '',
      privateKey: process.env.WECHAT_PAY_PRIVATE_KEY || '',
      platformPublicKey: process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY || '',
      apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || '',
      createOrderUrl: process.env.WECHAT_PAY_CREATE_URL || 'https://api.mch.weixin.qq.com/v3/pay/transactions/native',
      refundUrl: process.env.WECHAT_PAY_REFUND_URL || 'https://api.mch.weixin.qq.com/v3/refund/domestic/refunds'
    }
  };
}

module.exports = {
  buildBaseApiUrl,
  getPaymentConfig
};

