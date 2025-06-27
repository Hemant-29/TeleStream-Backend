// middlewares/uploadMiddleware.js
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 25 MB max per file
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

module.exports = upload;
