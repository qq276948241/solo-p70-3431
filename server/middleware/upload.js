const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('./auth');

const UPLOAD_DIR = path.join(path.dirname(__dirname), 'uploads');

const ALLOW_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const MAX_SIZE = 5 * 1024 * 1024;

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOW_EXT.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/gif/webp 图片格式'));
    }
  }
});

function uploadErrorHandler(err, req, res, next) {
  if (err && err.message && (
    err.message.includes('格式') ||
    err.message.includes('图片') ||
    err.message.includes('File too large') ||
    err.message.includes('Unexpected field')
  )) {
    const msg = err.message.includes('File too large')
      ? '图片大小不能超过 5MB'
      : err.message;
    return res.status(400).json({ code: 400, message: msg });
  }
  next(err);
}

function setupUploadRoutes(app) {
  ensureUploadDir();

  app.use('/uploads', expressStaticWrapper(UPLOAD_DIR));

  app.post('/api/upload/image', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的图片' });
    }
    res.json({
      code: 0,
      message: '上传成功',
      data: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size,
        originalname: req.file.originalname
      }
    });
  });

  app.use(uploadErrorHandler);
}

function expressStaticWrapper(dir) {
  const express = require('express');
  return express.static(dir);
}

function deleteProductImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return false;

  try {
    const filename = imageUrl.startsWith('/uploads/')
      ? imageUrl.slice('/uploads/'.length)
      : path.basename(imageUrl);

    if (!filename || filename === '.' || filename === '..') return false;
    if (ALLOW_EXT.includes(path.extname(filename).toLowerCase()) === false) return false;

    const absPath = path.normalize(path.join(UPLOAD_DIR, filename));
    const realUploadDir = path.normalize(UPLOAD_DIR);
    if (!absPath.startsWith(realUploadDir + path.sep) && absPath !== realUploadDir) {
      console.warn('[upload] 路径越界拦截:', imageUrl);
      return false;
    }

    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[upload] 删除图片失败:', imageUrl, e.message);
    return false;
  }
}

module.exports = {
  UPLOAD_DIR,
  upload,
  uploadErrorHandler,
  ensureUploadDir,
  setupUploadRoutes,
  deleteProductImage
};
