const jwt = require('jsonwebtoken');
const errorResponse = require('../utils/errorResponse');
const UserModel = require('../models/User.model');


const authenticateUser = async (req, res, next) => {

    // Get access token from the cookies
    const token = req.cookies.accessToken;

    if (!token) {
        return next(errorResponse(401, "no Access Token found"))
    }

    // Verify the jwt token
    const decoded = jwt.verify(token, process.env.Access_Token);
    if (!decoded || !decoded.id) {
        return next(errorResponse(400, "invalid Access Token"))
    }

    // fetch the user from userModel database
    const userID = decoded.id;
    const user = await UserModel.findById(userID).select("-password");

    if (!user) {
        return next(errorResponse(400, "User not found"));
    }

    // Attach user to request
    req.user = user;
    next();
}

module.exports = authenticateUser
