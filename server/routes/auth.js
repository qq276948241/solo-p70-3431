const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password, real_name, phone, community_name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }
  if (password.length < 6) {
    return res.status(400).json({ code: 400, message: '密码长度不能少于6位' });
  }

  const existing = db.prepare('SELECT id FROM leaders WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ code: 400, message: '用户名已存在' });
  }

  const id = 'leader-' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();
  const hashed = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO leaders (id, username, password, real_name, phone, community_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, hashed, real_name || '', phone || '', community_name || '', now, now);

  res.json({ code: 0, message: '注册成功', data: { id, username } });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }

  const leader = db.prepare('SELECT * FROM leaders WHERE username = ?').get(username);
  if (!leader) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }

  const valid = bcrypt.compareSync(password, leader.password);
  if (!valid) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }

  const token = signToken({
    id: leader.id,
    username: leader.username,
    real_name: leader.real_name
  });

  res.json({
    code: 0,
    message: '登录成功',
    data: {
      token,
      leader: {
        id: leader.id,
        username: leader.username,
        real_name: leader.real_name,
        phone: leader.phone,
        community_name: leader.community_name
      }
    }
  });
});

router.get('/profile', authMiddleware, (req, res) => {
  const leader = db.prepare(
    'SELECT id, username, real_name, phone, community_name, created_at FROM leaders WHERE id = ?'
  ).get(req.leader.id);

  if (!leader) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }

  res.json({ code: 0, data: leader });
});

module.exports = router;
