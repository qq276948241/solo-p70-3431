const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status = 'all', page = 1, page_size = 20 } = req.query;
  const leaderId = req.leader.id;

  let whereClause = 'WHERE leader_id = ?';
  const params = [leaderId];

  if (status !== 'all') {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const offset = (parseInt(page) - 1) * parseInt(page_size);
  params.push(parseInt(page_size), offset);

  const list = db.prepare(`
    SELECT * FROM orders ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params);

  const total = db.prepare(`SELECT COUNT(*) as count FROM orders ${whereClause}`).get(...params.slice(0, -2)).count;

  res.json({ code: 0, data: { list, total, page: parseInt(page), page_size: parseInt(page_size) } });
});

router.get('/stats', (req, res) => {
  const leaderId = req.leader.id;

  const pendingPayment = db.prepare('SELECT COUNT(*) as count FROM orders WHERE leader_id = ? AND status = ?').get(leaderId, 'pending_payment').count;
  const pendingPickup = db.prepare('SELECT COUNT(*) as count FROM orders WHERE leader_id = ? AND status = ?').get(leaderId, 'pending_pickup').count;
  const completed = db.prepare('SELECT COUNT(*) as count FROM orders WHERE leader_id = ? AND status = ?').get(leaderId, 'completed').count;
  const totalAmount = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as amount FROM orders WHERE leader_id = ? AND status IN (?, ?)').get(leaderId, 'pending_pickup', 'completed').amount;

  res.json({
    code: 0,
    data: {
      pending_payment: pendingPayment,
      pending_pickup: pendingPickup,
      completed,
      total_amount: totalAmount
    }
  });
});

router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  res.json({ code: 0, data: order });
});

router.post('/', (req, res) => {
  const { product_id, quantity, customer_name, customer_phone, customer_address, remark } = req.body;
  const leaderId = req.leader.id;

  if (!product_id || !quantity || !customer_name || !customer_phone) {
    return res.status(400).json({ code: 400, message: '商品ID、数量、客户姓名、电话不能为空' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND leader_id = ?').get(product_id, leaderId);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }
  if (product.status !== 'active') {
    return res.status(400).json({ code: 400, message: '商品已下架' });
  }
  if (dayjs(product.deadline).isBefore(dayjs())) {
    return res.status(400).json({ code: 400, message: '商品已过截团时间，无法下单' });
  }
  if (parseInt(quantity) < parseInt(product.min_quantity)) {
    return res.status(400).json({ code: 400, message: `最少购买${product.min_quantity}${product.unit}` });
  }
  if (parseInt(quantity) > parseInt(product.stock)) {
    return res.status(400).json({ code: 400, message: `库存不足，仅剩${product.stock}${product.unit}` });
  }

  const id = 'order-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();
  const totalAmount = parseFloat((product.price * parseInt(quantity)).toFixed(2));

  db.prepare(`
    INSERT INTO orders (id, leader_id, product_id, product_name, product_price, quantity, total_amount,
      customer_name, customer_phone, customer_address, remark, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)
  `).run(
    id, leaderId,
    product.id, product.name, product.price,
    parseInt(quantity), totalAmount,
    customer_name, customer_phone, customer_address || '', remark || '',
    now, now
  );

  res.json({ code: 0, message: '下单成功，请尽快支付', data: { id, total_amount: totalAmount } });
});

router.post('/:id/pay', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  if (order.status !== 'pending_payment') {
    return res.status(400).json({ code: 400, message: '当前订单状态不允许支付' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(order.product_id);
  if (product && dayjs(product.deadline).isBefore(dayjs())) {
    return res.status(400).json({ code: 400, message: '商品已过截团时间，无法支付' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders SET status = 'pending_pickup', paid_at = ?, updated_at = ?
    WHERE id = ? AND leader_id = ?
  `).run(now, now, req.params.id, req.leader.id);

  if (product) {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(order.quantity, product.id);
  }

  res.json({ code: 0, message: '支付成功，等待提货' });
});

router.post('/:id/pickup', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  if (order.status !== 'pending_pickup') {
    return res.status(400).json({ code: 400, message: '当前订单状态不允许标记提货' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders SET status = 'completed', picked_at = ?, updated_at = ?
    WHERE id = ? AND leader_id = ?
  `).run(now, now, req.params.id, req.leader.id);

  res.json({ code: 0, message: '提货完成' });
});

router.post('/mock-payment-callback', (req, res) => {
  const { order_id, success = true } = req.body;
  if (!order_id) {
    return res.status(400).json({ code: 400, message: '订单ID不能为空' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND leader_id = ?').get(order_id, req.leader.id);
  if (!order) {
    return res.status(404).json({ code: 404, message: '订单不存在' });
  }
  if (order.status !== 'pending_payment') {
    return res.json({ code: 0, message: '订单无需重复支付' });
  }

  if (!success) {
    return res.json({ code: 1, message: '模拟支付失败' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(order.product_id);
  if (product && dayjs(product.deadline).isBefore(dayjs())) {
    return res.json({ code: 1, message: '已过截团时间，支付失败' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders SET status = 'pending_pickup', paid_at = ?, updated_at = ?
    WHERE id = ? AND leader_id = ?
  `).run(now, now, order_id, req.leader.id);

  if (product) {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(order.quantity, product.id);
  }

  res.json({ code: 0, message: '模拟支付回调成功' });
});

module.exports = router;
