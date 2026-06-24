const db = require('./db');
const bcrypt = require('bcryptjs');

db.exec(`
CREATE TABLE IF NOT EXISTS leaders (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  real_name TEXT,
  phone TEXT,
  community_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  leader_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  price REAL NOT NULL,
  unit TEXT DEFAULT '份',
  min_quantity INTEGER NOT NULL DEFAULT 1,
  stock INTEGER DEFAULT 999,
  description TEXT,
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (leader_id) REFERENCES leaders(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  leader_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  remark TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  paid_at TEXT,
  picked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (leader_id) REFERENCES leaders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_products_leader ON products(leader_id);
CREATE INDEX IF NOT EXISTS idx_orders_leader ON orders(leader_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
`);

const leaderId1 = 'leader-' + Date.now() + '-1';
const leaderId2 = 'leader-' + Date.now() + '-2';
const hash1 = bcrypt.hashSync('123456', 10);
const hash2 = bcrypt.hashSync('123456', 10);
const now = new Date().toISOString();

const insertLeader = db.prepare(`
  INSERT OR IGNORE INTO leaders (id, username, password, real_name, phone, community_name, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
insertLeader.run(leaderId1, 'leader01', hash1, '张团长', '13800000001', '阳光花园小区', now, now);
insertLeader.run(leaderId2, 'leader02', hash2, '李团长', '13800000002', '幸福里小区', now, now);

console.log('数据库初始化完成!');
console.log('测试账号: leader01 / 123456, leader02 / 123456');
