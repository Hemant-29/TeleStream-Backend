const mongoose = require('mongoose');
const UserModel = require('../models/User.model.js');
const bcrypt = require('bcryptjs');
const errorResponse = require('../utils/errorResponse.js');
const jwt = require('jsonwebtoken')

// Define the salt rounds for hashing
const saltRounds = 10;

const jwt_secret = process.env.Access_Token;

const testLogin = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.status(401).json({ success: false, msg: "Not logged in" });
        }
        const decoded = jwt.verify(token, process.env.Access_Token);
        return res.json({ success: true, user: decoded, msg: "User logged in" });
    } catch (error) {
        next(error)
    }
}

const signup = async (req, res, next) => {
    try {
        // Access the Request Body
        const { username, email, password, channel } = req.body;

        // Hash the password
        let hashedPassword = undefined
        if (password) {
            hashedPassword = bcrypt.hashSync(password, saltRounds);
        }

        // Create and save the newly created user
        const newUser = new UserModel({ username, email, channel, password: hashedPassword });
        await newUser.save();

        // Send sucessful response
        res.status(200).json({ msg: "Signed up sucessfully", user: newUser })
    } catch (error) {
        next(error)
    }
}

const login = async (req, res, next) => {
    try {
        // Get Request body
        const { username, password } = req.body;

        if (!username) {
            return next("Provide a username or email."); // Trigger error if no identifier is provided
        }

        // Fetch User from database
        let user;
        if (username.includes("@") && username.includes(".")) {
            user = await UserModel.findOne({ email: username });
        } else {
            user = await UserModel.findOne({ username: username });
        }

        // If user not found
        if (!user) {
            next("No user found");
            return;
        }

        // Compare provided password
        const correctPassword = await bcrypt.compare(password, user.password);
        if (!correctPassword) {
            next(errorResponse(400, "Incorrect password"));
            return;
        }

        // Generate jwt token
        const token = jwt.sign({ id: user._id }, jwt_secret);

        // Set token in a cookie

        const cookieOptions = {
            httpOnly: true, // Prevents client-side access to cookies
            secure: process.env.NODE_ENV === 'production', // Ensures secure cookies in production
            sameSite: "None", // Helps send cookie to another site upon deployment
            maxAge: 7 * 24 * 60 * 60 * 1000 // Expires in 7 days
        };  // Cookie options

        res.cookie("accessToken", token, cookieOptions);

        // Return response
        return res.status(200).json({ msg: "logged in successfully", user: { ...user._doc, password: undefined } })
    } catch (error) {
        next(error);
    }
}

const changePassword = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(errorResponse(401, "Error with Access Token, no user found"));
        }

        if (!req.body.oldPassword) {
            return next(errorResponse(400, "provide previous password"));
        }

        if (!req.body.newPassword) {
            return next(errorResponse(400, "please provide new password"));
        }

        // fetch user from user ID
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }


        // Compare provided password
        const passwordCorrect = await bcrypt.compare(req.body.oldPassword, user.password);
        if (!passwordCorrect) {
            return next(errorResponse(400, "Incorrect password"));
        }

        // Set new Password
        user.password = bcrypt.hashSync(req.body.newPassword, saltRounds);
        user.save();

        // response
        res.status(200).json({ msg: "password updated successfully", user: { ...user._doc, password: undefined } })
    } catch (error) {
        return next(error)
    }
}

const logout = async (req, res, next) => {
    try {
        if (!req.user) {
            next(errorResponse(401, "Error with Access Token, no user found"))
            return
        }
        // Get User from user ID
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }

        // Clear the accessToken cookie
        res.clearCookie("accessToken", {
            path: "/",         // Make sure it clears across the entire site
            httpOnly: true,    // Ensure the cookie was set as httpOnly
        });

        res.status(200).json({ msg: "User logged out successfully" })
    } catch (error) {
        return next(error);
    }
}

module.exports = { signup, login, logout, changePassword, testLogin };