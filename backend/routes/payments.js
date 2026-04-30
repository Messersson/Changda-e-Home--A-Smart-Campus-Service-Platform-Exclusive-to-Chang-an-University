const express = require('express');
const axios = require('axios');
const { body, param } = require('express-validator');

const db = require('../database/database');
const DatabaseAdapter = require('../database/adapter');
const { authMiddleware } = require('../middleware/auth');
const { buildBaseApiUrl, getPaymentConfig } = require('../utils/paymentConfig');
const {
  randomString,
  signWithRsaSha256,
  verifyWithRsaSha256,
  buildWechatAuthorization,
  verifyWechatSignature,
  decryptWechatResource
} = require('../utils/paymentCrypto');

const router = express.Router();

function buildOutTradeNo(orderId) {
  return `P${orderId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function buildOutRefundNo(paymentId) {
  return `R${paymentId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function buildAlipaySignContent(params) {
  return Object.keys(params)
    .filter((key) => key !== 'sign' && key !== 'sign_type' && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

function normalizePayment(payment, extra = {}) {
  if (!payment) return null;

  return {
    ...payment,
    orderId: payment.order_id,
    userId: payment.user_id,
    outTradeNo: payment.out_trade_no,
    payUrl: payment.pay_url,
    amount: Number(payment.amount || 0),
    createdAt: payment.created_at,
    paidAt: payment.paid_at,
    ...extra
  };
}

function sameUser(left, right) {
  return Number(left) === Number(right);
}

async function markPaymentSuccessByOutTradeNo(outTradeNo, rawPayload) {
  return DatabaseAdapter.transaction(async (connection) => {
    const [paymentRows] = await connection.query(
      'SELECT * FROM payments WHERE out_trade_no = ? FOR UPDATE',
      [outTradeNo]
    );
    const payment = paymentRows[0];
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [payment.order_id]);
    const order = orderRows[0];
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    if (payment.status !== 'paid') {
      const paidAt = new Date();
      await connection.query(
        'UPDATE payments SET status = ?, paid_at = ?, notify_payload = ? WHERE id = ?',
        ['paid', paidAt, rawPayload, payment.id]
      );
      await connection.query(
        'UPDATE orders SET payment_status = ?, paid_at = ? WHERE id = ?',
        ['paid', paidAt, order.id]
      );
    }

    const [updatedRows] = await connection.query('SELECT * FROM payments WHERE id = ?', [payment.id]);
    return updatedRows[0];
  });
}

async function createAlipayOrder({ order, payment, req, config }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const notifyUrl = `${buildBaseApiUrl(req)}/api/payments/alipay/notify`;
  const bizContent = JSON.stringify({
    out_trade_no: payment.outTradeNo,
    total_amount: Number(order.total_amount || 0).toFixed(2),
    subject: `校园服务订单#${order.id}`,
    timeout_express: '15m'
  });

  const params = {
    app_id: config.alipay.appId,
    method: 'alipay.trade.precreate',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: now,
    version: '1.0',
    notify_url: notifyUrl,
    biz_content: bizContent
  };

  const signContent = buildAlipaySignContent(params);
  params.sign = signWithRsaSha256(signContent, config.alipay.privateKey);

  const payload = new URLSearchParams(params);
  const { data } = await axios.post(config.alipay.gateway, payload.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 12000
  });

  const response = data?.alipay_trade_precreate_response;
  if (!response || response.code !== '10000') {
    throw new Error(`ALIPAY_CREATE_FAILED:${response?.sub_msg || response?.msg || 'unknown'}`);
  }

  return {
    payUrl: response.qr_code,
    channelData: response
  };
}

async function createWechatOrder({ order, payment, req, config }) {
  const notifyUrl = `${buildBaseApiUrl(req)}/api/payments/wechat/notify`;
  const requestBody = {
    mchid: config.wechat.mchid,
    appid: config.wechat.appid,
    description: `校园服务订单#${order.id}`,
    out_trade_no: payment.outTradeNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(Number(order.total_amount || 0) * 100),
      currency: 'CNY'
    }
  };

  const bodyString = JSON.stringify(requestBody);
  const requestPath = new URL(config.wechat.createOrderUrl).pathname;
  const authorization = buildWechatAuthorization({
    method: 'POST',
    requestPath,
    body: bodyString,
    mchid: config.wechat.mchid,
    serialNo: config.wechat.serialNo,
    privateKey: config.wechat.privateKey
  });

  const { data } = await axios.post(config.wechat.createOrderUrl, requestBody, {
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'chd-campus-platform/1.0'
    },
    timeout: 12000
  });

  if (!data?.code_url) {
    throw new Error(`WECHAT_CREATE_FAILED:${data?.message || 'missing code_url'}`);
  }

  return {
    payUrl: data.code_url,
    channelData: data
  };
}

router.post('/create', [
  authMiddleware,
  body('orderId').isInt({ min: 1 }).withMessage('订单ID不合法'),
  body('provider').optional().isString().withMessage('支付渠道不合法')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse(validation.errors[0].msg));
  }

  const config = getPaymentConfig();
  const userId = req.user.id;
  const orderId = parseInt(req.body.orderId, 10);
  const provider = String(req.body.provider || config.defaultProvider).toLowerCase();

  if (!config.supportedProviders.includes(provider)) {
    return res.status(400).json(db.errorResponse('暂不支持该支付渠道'));
  }

  if (provider === 'mock' && !config.mockEnabled) {
    return res.status(403).json(db.errorResponse('模拟支付已关闭'));
  }

  if (provider === 'alipay' && !config.alipay.enabled) {
    return res.status(403).json(db.errorResponse('支付宝支付未启用'));
  }

  if (provider === 'wechat' && !config.wechat.enabled) {
    return res.status(403).json(db.errorResponse('微信支付未启用'));
  }

  try {
    const order = await db.getOrderById(orderId);
    if (!order || !sameUser(order.user_id, userId)) {
      return res.status(404).json(db.errorResponse('订单不存在'));
    }

    if (order.status === 'cancelled') {
      return res.status(400).json(db.errorResponse('订单已取消，无法支付'));
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json(db.errorResponse('订单已支付，无需重复支付'));
    }

    const existingPayment = await db.getLatestActivePaymentByOrderId(orderId);
    if (existingPayment && sameUser(existingPayment.user_id, userId) && existingPayment.provider === provider && existingPayment.pay_url) {
      return res.json(db.successResponse(normalizePayment(existingPayment), '已生成支付单'));
    }

    const created = await db.createPayment({
      orderId,
      userId,
      provider,
      outTradeNo: buildOutTradeNo(orderId),
      amount: Number(order.total_amount || 0),
      status: 'created',
      payUrl: null
    });

    const paymentRow = await db.getPaymentById(created.id);
    let result = { payUrl: null, channelData: null };

    if (provider === 'mock') {
      result.payUrl = `${config.frontendBaseUrl.replace(/\/+$/, '')}/pay/mock/${created.id}`;
    } else if (provider === 'alipay') {
      result = await createAlipayOrder({ order, payment: paymentRow, req, config });
    } else if (provider === 'wechat') {
      result = await createWechatOrder({ order, payment: paymentRow, req, config });
    }

    await db.updatePayment(created.id, { payUrl: result.payUrl });
    const updated = await db.getPaymentById(created.id);
    return res.json(db.successResponse(normalizePayment(updated, { channelData: result.channelData }), '支付单已创建'));
  } catch (error) {
    console.error('[Payments create]', error);
    return res.status(500).json(db.errorResponse('创建支付单失败'));
  }
});

router.get('/:id', [
  authMiddleware,
  param('id').isInt({ min: 1 }).withMessage('支付单ID不合法')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse(validation.errors[0].msg));
  }

  const userId = req.user.id;
  const paymentId = parseInt(req.params.id, 10);

  try {
    const payment = await db.getPaymentById(paymentId);
    if (!payment || !sameUser(payment.user_id, userId)) {
      return res.status(404).json(db.errorResponse('支付单不存在'));
    }

    return res.json(db.successResponse(normalizePayment(payment)));
  } catch (error) {
    console.error('[Payments detail]', error);
    return res.status(500).json(db.errorResponse('获取支付单失败'));
  }
});

router.post('/:id/refund', [
  authMiddleware,
  param('id').isInt({ min: 1 }).withMessage('支付单ID不合法'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('退款金额不合法'),
  body('reason').optional().isString().isLength({ max: 255 }).withMessage('退款原因不合法')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse(validation.errors[0].msg));
  }

  const config = getPaymentConfig();
  const userId = req.user.id;
  const paymentId = parseInt(req.params.id, 10);
  const reason = req.body.reason || '用户申请退款';

  try {
    const payment = await db.getPaymentById(paymentId);
    if (!payment || !sameUser(payment.user_id, userId)) {
      return res.status(404).json(db.errorResponse('支付单不存在'));
    }

    if (payment.status !== 'paid') {
      return res.status(400).json(db.errorResponse('当前支付单状态不支持退款'));
    }

    const order = await db.getOrderById(payment.order_id);
    if (!order || !sameUser(order.user_id, userId)) {
      return res.status(404).json(db.errorResponse('订单不存在'));
    }

    const refundAmount = Number(req.body.amount || payment.amount || order.total_amount || 0);
    if (refundAmount <= 0 || refundAmount > Number(payment.amount || 0)) {
      return res.status(400).json(db.errorResponse('退款金额超出支付金额'));
    }

    const outRefundNo = buildOutRefundNo(paymentId);
    const createdRefund = await db.createRefund({
      paymentId: payment.id,
      orderId: order.id,
      userId,
      provider: payment.provider,
      outRefundNo,
      amount: refundAmount,
      reason,
      status: 'created'
    });

    let refundStatus = 'success';
    let refundNo = null;
    let rawResponse = '';

    if (payment.provider === 'mock') {
      rawResponse = JSON.stringify({ mock: true, success: true });
    } else if (payment.provider === 'alipay') {
      if (!config.alipay.enabled) {
        throw new Error('ALIPAY_DISABLED');
      }

      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const params = {
        app_id: config.alipay.appId,
        method: 'alipay.trade.refund',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: now,
        version: '1.0',
        biz_content: JSON.stringify({
          out_trade_no: payment.out_trade_no,
          refund_amount: refundAmount.toFixed(2),
          refund_reason: reason,
          out_request_no: outRefundNo
        })
      };

      const signContent = buildAlipaySignContent(params);
      params.sign = signWithRsaSha256(signContent, config.alipay.privateKey);
      const payload = new URLSearchParams(params);
      const { data } = await axios.post(config.alipay.gateway, payload.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 12000
      });

      const response = data?.alipay_trade_refund_response;
      if (!response || response.code !== '10000') {
        throw new Error(`ALIPAY_REFUND_FAILED:${response?.sub_msg || response?.msg || 'unknown'}`);
      }

      refundNo = response.trade_no || null;
      rawResponse = JSON.stringify(response);
    } else if (payment.provider === 'wechat') {
      if (!config.wechat.enabled) {
        throw new Error('WECHAT_DISABLED');
      }

      const requestBody = {
        out_trade_no: payment.out_trade_no,
        out_refund_no: outRefundNo,
        reason,
        notify_url: `${buildBaseApiUrl(req)}/api/payments/wechat/refund-notify`,
        amount: {
          refund: Math.round(refundAmount * 100),
          total: Math.round(Number(payment.amount || 0) * 100),
          currency: 'CNY'
        }
      };

      const bodyString = JSON.stringify(requestBody);
      const requestPath = new URL(config.wechat.refundUrl).pathname;
      const authorization = buildWechatAuthorization({
        method: 'POST',
        requestPath,
        body: bodyString,
        mchid: config.wechat.mchid,
        serialNo: config.wechat.serialNo,
        privateKey: config.wechat.privateKey
      });

      const { data } = await axios.post(config.wechat.refundUrl, requestBody, {
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'chd-campus-platform/1.0'
        },
        timeout: 12000
      });

      refundNo = data?.refund_id || null;
      rawResponse = JSON.stringify(data || {});
      if (!data?.status || !['SUCCESS', 'PROCESSING'].includes(data.status)) {
        refundStatus = 'failed';
      }
    } else {
      throw new Error('PROVIDER_NOT_SUPPORTED');
    }

    const refundedAt = refundStatus === 'success' ? new Date() : null;
    await db.updateRefund(createdRefund.id, {
      status: refundStatus,
      refundNo,
      rawResponse,
      refundedAt
    });

    if (refundStatus === 'success') {
      await db.updatePayment(payment.id, { status: 'refunded' });
      await db.updateOrder(order.id, { paymentStatus: 'refunded' });
    }

    const refund = await db.getRefundById(createdRefund.id);
    return res.json(db.successResponse(refund, refundStatus === 'success' ? '退款成功' : '退款处理中'));
  } catch (error) {
    console.error('[Payments refund]', error);
    return res.status(500).json(db.errorResponse('退款失败'));
  }
});

router.post('/alipay/notify', express.urlencoded({ extended: false }), async (req, res) => {
  const config = getPaymentConfig();
  try {
    if (!config.alipay.enabled) {
      return res.status(400).send('fail');
    }

    const notifyData = req.body || {};
    const sign = notifyData.sign;
    const tradeStatus = notifyData.trade_status;
    const outTradeNo = notifyData.out_trade_no;

    const signContent = buildAlipaySignContent(notifyData);
    const verified = verifyWithRsaSha256(signContent, sign, config.alipay.publicKey);
    if (!verified) {
      return res.status(400).send('fail');
    }

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      await markPaymentSuccessByOutTradeNo(outTradeNo, JSON.stringify(notifyData));
    }

    return res.send('success');
  } catch (error) {
    console.error('[Alipay notify]', error);
    return res.status(500).send('fail');
  }
});

router.post('/wechat/notify', async (req, res) => {
  const config = getPaymentConfig();
  try {
    if (!config.wechat.enabled) {
      return res.status(400).json({ code: 'FAIL', message: 'wechat disabled' });
    }

    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];
    const signature = req.headers['wechatpay-signature'];
    const bodyText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});

    const verified = verifyWechatSignature({
      timestamp,
      nonce,
      signature,
      body: bodyText,
      publicKey: config.wechat.platformPublicKey
    });
    if (!verified) {
      return res.status(400).json({ code: 'FAIL', message: 'invalid signature' });
    }

    const payload = JSON.parse(bodyText || '{}');
    const resource = payload.resource || {};
    const decrypted = decryptWechatResource({
      ciphertext: resource.ciphertext,
      nonce: resource.nonce,
      associatedData: resource.associated_data || '',
      apiV3Key: config.wechat.apiV3Key
    });
    const notify = JSON.parse(decrypted || '{}');

    if (notify.trade_state === 'SUCCESS' && notify.out_trade_no) {
      await markPaymentSuccessByOutTradeNo(notify.out_trade_no, bodyText);
    }

    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('[Wechat notify]', error);
    return res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
});

router.post('/wechat/refund-notify', async (req, res) => {
  const config = getPaymentConfig();
  try {
    if (!config.wechat.enabled) {
      return res.status(400).json({ code: 'FAIL', message: 'wechat disabled' });
    }

    const timestamp = req.headers['wechatpay-timestamp'];
    const nonce = req.headers['wechatpay-nonce'];
    const signature = req.headers['wechatpay-signature'];
    const bodyText = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {});

    const verified = verifyWechatSignature({
      timestamp,
      nonce,
      signature,
      body: bodyText,
      publicKey: config.wechat.platformPublicKey
    });
    if (!verified) {
      return res.status(400).json({ code: 'FAIL', message: 'invalid signature' });
    }

    const payload = JSON.parse(bodyText || '{}');
    const resource = payload.resource || {};
    const decrypted = decryptWechatResource({
      ciphertext: resource.ciphertext,
      nonce: resource.nonce,
      associatedData: resource.associated_data || '',
      apiV3Key: config.wechat.apiV3Key
    });
    const notify = JSON.parse(decrypted || '{}');

    const outRefundNo = notify.out_refund_no;
    if (outRefundNo) {
      const refund = await db.getRefundByOutRefundNo(outRefundNo);
      if (refund) {
        const status = notify.refund_status === 'SUCCESS' ? 'success' : (notify.refund_status || 'created').toLowerCase();
        await db.updateRefund(refund.id, {
          status,
          refundNo: notify.refund_id || refund.refund_no,
          rawResponse: bodyText,
          refundedAt: status === 'success' ? new Date() : null
        });

        if (status === 'success') {
          await db.updatePayment(refund.payment_id, { status: 'refunded' });
          await db.updateOrder(refund.order_id, { paymentStatus: 'refunded' });
        }
      }
    }

    return res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('[Wechat refund notify]', error);
    return res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
});

router.post('/:id/mock/confirm', [
  authMiddleware,
  param('id').isInt({ min: 1 }).withMessage('支付单ID不合法')
], async (req, res) => {
  const validation = db.validateRequest(req);
  if (!validation.success) {
    return res.status(400).json(db.errorResponse(validation.errors[0].msg));
  }

  const config = getPaymentConfig();
  if (!config.mockEnabled) {
    return res.status(403).json(db.errorResponse('模拟支付已关闭'));
  }

  const userId = req.user.id;
  const paymentId = parseInt(req.params.id, 10);

  try {
    const updatedPayment = await DatabaseAdapter.transaction(async (connection) => {
      const [paymentRows] = await connection.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [paymentId]);
      const payment = paymentRows[0];
      if (!payment || !sameUser(payment.user_id, userId)) {
        const notFoundError = new Error('PAYMENT_NOT_FOUND');
        notFoundError.httpStatus = 404;
        throw notFoundError;
      }

      if (payment.provider !== 'mock') {
        throw new Error('PROVIDER_NOT_ALLOWED');
      }

      if (payment.status !== 'created') {
        throw new Error('PAYMENT_STATUS_NOT_ALLOWED');
      }

      const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [payment.order_id]);
      const order = orderRows[0];
      if (!order || !sameUser(order.user_id, userId)) {
        const orderError = new Error('ORDER_NOT_FOUND');
        orderError.httpStatus = 404;
        throw orderError;
      }

      const paidAt = new Date();
      await connection.query('UPDATE payments SET status = ?, paid_at = ? WHERE id = ?', ['paid', paidAt, payment.id]);
      await connection.query('UPDATE orders SET payment_status = ?, paid_at = ? WHERE id = ?', ['paid', paidAt, order.id]);

      const [rows] = await connection.query('SELECT * FROM payments WHERE id = ?', [payment.id]);
      return rows[0];
    });

    return res.json(db.successResponse(normalizePayment(updatedPayment), '支付成功'));
  } catch (error) {
    if (error.httpStatus === 404) {
      return res.status(404).json(db.errorResponse('支付单不存在'));
    }
    return res.status(400).json(db.errorResponse('当前支付单状态不支持确认支付'));
  }
});

module.exports = router;
