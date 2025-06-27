const express = require('express');
const router = express.Router();

const { signup, login, logout, changePassword, testLogin } = require("../controllers/auth.js");
const authenticateUser = require('../middlewares/authenticateUser.js');

// Login testing route
router.get("/test", testLogin)

// Create a User
router.post('/signup', signup);

// Login a user
router.post('/login', login);

// Logout a user
router.post('/logout', authenticateUser, logout)

// Change user password
router.put('/reset_password', authenticateUser, changePassword)


// Google Authentication

module.exports = router