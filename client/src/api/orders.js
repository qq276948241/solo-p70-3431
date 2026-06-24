import request from '@/utils/request'

export function getOrders(params) {
  return request.get('/orders', { params })
}

export function getOrder(id) {
  return request.get(`/orders/${id}`)
}

export function getOrderStats() {
  return request.get('/orders/stats')
}

export function createOrder(data) {
  return request.post('/orders', data)
}

export function payOrder(id) {
  return request.post(`/orders/${id}/pay`)
}

export function pickupOrder(id) {
  return request.post(`/orders/${id}/pickup`)
}

export function mockPaymentCallback(data) {
  return request.post('/orders/mock-payment-callback', data)
}
