const express = require('express');
const router = express.Router();
const { test, fetchUser, getAllUsers, getUserDetails, updateUser, deleteUser, subscribeChannel, unsubscribeChannel } = require('../controllers/user');
const authenticateUser = require('../middlewares/authenticateUser');

router.get("/test", test);

// Get a user
router.get("/", authenticateUser, fetchUser);

// Get all the users
router.get("/all", getAllUsers);

// Get user Details by their ID
router.get("/:id", getUserDetails)

// Update a user
router.patch("/update", authenticateUser, updateUser);

// Delete a User
router.delete("/delete", authenticateUser, deleteUser);

// Subscribe to a channel
router.post("/subscribe/:id", authenticateUser, subscribeChannel);

// Un-subscribe from a channel
router.post("/unsubscribe/:id", authenticateUser, unsubscribeChannel);



module.exports = router;