const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const HttpError = require('../utils/httpError');

// Extension comes from the MIME type the server accepted, never from the client's filename
// (a file named "blob" would otherwise be saved without one and served as octet-stream).
const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(12).toString('hex') + EXT[file.mimetype]),
});

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) =>
    /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(400, 'Cover image must be png, jpg, webp or gif')),
}).single('cover_image');
