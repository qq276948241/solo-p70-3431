const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status = 'active', page = 1, page_size = 20, only_today = '0' } = req.query;
  const leaderId = req.leader.id;

  let whereClause = 'WHERE leader_id = ?';
  const params = [leaderId];

  if (status !== 'all') {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  if (only_today === '1') {
    const todayStart = dayjs().startOf('day').toISOString();
    const todayEnd = dayjs().endOf('day').toISOString();
    whereClause += ' AND created_at >= ? AND created_at <= ?';
    params.push(todayStart, todayEnd);
  }

  const offset = (parseInt(page) - 1) * parseInt(page_size);
  params.push(parseInt(page_size), offset);

  const list = db.prepare(`
    SELECT * FROM products ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params);

  const total = db.prepare(`SELECT COUNT(*) as count FROM products ${whereClause}`).get(...params.slice(0, -2)).count;

  const listWithDeadline = list.map(p => ({
    ...p,
    is_expired: dayjs(p.deadline).isBefore(dayjs())
  }));

  res.json({ code: 0, data: { list: listWithDeadline, total, page: parseInt(page), page_size: parseInt(page_size) } });
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }
  product.is_expired = dayjs(product.deadline).isBefore(dayjs());
  res.json({ code: 0, data: product });
});

router.post('/', (req, res) => {
  const { name, image, price, unit, min_quantity, stock, description, deadline } = req.body;

  if (!name || !price || !deadline) {
    return res.status(400).json({ code: 400, message: '商品名称、价格、截团时间不能为空' });
  }
  if (price <= 0) {
    return res.status(400).json({ code: 400, message: '价格必须大于0' });
  }
  if (dayjs(deadline).isBefore(dayjs())) {
    return res.status(400).json({ code: 400, message: '截团时间不能早于当前时间' });
  }

  const id = 'product-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (id, leader_id, name, image, price, unit, min_quantity, stock, description, deadline, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id, req.leader.id,
    name, image || '',
    parseFloat(price),
    unit || '份',
    parseInt(min_quantity) || 1,
    parseInt(stock) || 999,
    description || '',
    dayjs(deadline).toISOString(),
    now, now
  );

  res.json({ code: 0, message: '商品创建成功', data: { id } });
});

router.put('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }

  const { name, image, price, unit, min_quantity, stock, description, deadline } = req.body;

  if (deadline && dayjs(deadline).isBefore(dayjs())) {
    return res.status(400).json({ code: 400, message: '截团时间不能早于当前时间' });
  }
  if (price !== undefined && price <= 0) {
    return res.status(400).json({ code: 400, message: '价格必须大于0' });
  }

  const now = new Date().toISOString();
  const newDeadline = deadline ? dayjs(deadline).toISOString() : product.deadline;

  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      image = COALESCE(?, image),
      price = COALESCE(?, price),
      unit = COALESCE(?, unit),
      min_quantity = COALESCE(?, min_quantity),
      stock = COALESCE(?, stock),
      description = COALESCE(?, description),
      deadline = ?,
      updated_at = ?
    WHERE id = ? AND leader_id = ?
  `).run(
    name, image,
    price !== undefined ? parseFloat(price) : null,
    unit,
    min_quantity !== undefined ? parseInt(min_quantity) : null,
    stock !== undefined ? parseInt(stock) : null,
    description,
    newDeadline,
    now,
    req.params.id, req.leader.id
  );

  res.json({ code: 0, message: '商品更新成功' });
});

router.post('/:id/offline', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE products SET status = ?, updated_at = ? WHERE id = ? AND leader_id = ?')
    .run('offline', now, req.params.id, req.leader.id);

  res.json({ code: 0, message: '商品已下架' });
});

router.post('/:id/online', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND leader_id = ?').get(req.params.id, req.leader.id);
  if (!product) {
    return res.status(404).json({ code: 404, message: '商品不存在' });
  }
  if (dayjs(product.deadline).isBefore(dayjs())) {
    return res.status(400).json({ code: 400, message: '该商品已过截团时间，无法上架' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE products SET status = ?, updated_at = ? WHERE id = ? AND leader_id = ?')
    .run('active', now, req.params.id, req.leader.id);

  res.json({ code: 0, message: '商品已上架' });
});

module.exports = router;
