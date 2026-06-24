const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('./middleware/auth');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const db = require('./db');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowTypes.includes(ext)) cb(null, true);
    else cb(new Error('仅支持 jpg/png/gif/webp 图片格式'));
  }
});

app.post('/api/upload/image', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 400, message: '请选择要上传的图片' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ code: 0, message: '上传成功', data: { url, filename: req.file.filename } });
});

app.use((err, req, res, next) => {
  if (err && err.message && (err.message.includes('格式') || err.message.includes('图片') || err.message.includes('File'))) {
    return res.status(400).json({ code: 400, message: err.message });
  }
  next(err);
});

app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: '社区团购服务运行正常', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 社区团购后端服务已启动`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`💡 首次使用请先执行: cd server && npm run init:db`);
  console.log(`========================================\n`);
});
