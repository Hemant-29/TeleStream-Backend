const express = require('express');
const router = express.Router();
const { test, addComment } = require('../controllers/comment');
const authenticateUser = require('../middlewares/authenticateUser');

// Add comment
router.post("/:videoID", authenticateUser, addComment);

module.exports = router;