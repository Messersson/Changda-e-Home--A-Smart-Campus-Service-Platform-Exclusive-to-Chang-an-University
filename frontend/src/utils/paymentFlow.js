import { ElMessage } from 'element-plus'
import { paymentApi } from '@/api'

const defaultPaymentProvider = import.meta.env.VITE_PAYMENT_PROVIDER || 'mock'

function shouldFallbackToMock(error) {
  const status = error?.response?.status
  const message = String(error?.response?.data?.message || error?.message || '')
  if (status === 403) {
    return true
  }

  // axios response interceptor wraps business errors into plain Error(message),
  // so fallback should also rely on message keywords.
  return (
    message.includes('未启用') ||
    message.includes('暂不支持') ||
    message.includes('没有操作权限') ||
    message.includes('支付渠道')
  )
}

export async function startPaymentByOrderId(orderId, router, provider = defaultPaymentProvider) {
  let result
  let usingProvider = provider

  try {
    result = await paymentApi.createPayment({ orderId, provider: usingProvider })
  } catch (error) {
    if (usingProvider !== 'mock' && shouldFallbackToMock(error)) {
      usingProvider = 'mock'
      ElMessage.warning('当前支付渠道未启用，已自动切换到模拟支付')
      result = await paymentApi.createPayment({ orderId, provider: usingProvider })
    } else {
      throw error
    }
  }

  const paymentId = Number(result?.data?.id || 0)
  const payUrl = result?.data?.payUrl
  const paymentProvider = result?.data?.provider || usingProvider
  const amount = result?.data?.amount

  if (paymentId > 0) {
    await router.push({
      path: `/pay/${paymentId}`,
      query: {
        orderId: String(orderId),
        payUrl: payUrl || '',
        provider: paymentProvider || '',
        amount: typeof amount === 'number' ? String(amount) : ''
      }
    })
    return result
  }

  if (payUrl) {
    window.open(payUrl, '_blank')
    return result
  }

  ElMessage.error('未获取到支付信息，请稍后重试')
  return result
}
