// middlewares/uploadMiddleware.js
const multer = require('multer');

// Use memory(RAM) storage to temporarily store the files
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 }, // 50 MB max per file
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

module.exports = upload;

