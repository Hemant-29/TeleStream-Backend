const mongoose = require("mongoose")
const UserModel = require("../models/User.model")
const VideoModel = require("../models/Video.model")
const errorResponse = require("../utils/errorResponse")

const test = (req, res) => {
    res.send("this is the test route...")
}



// ______________________________  Basic Crud Operations  _____________________________

// This is the method of fetching the user from cookie Authentication
const fetchUser = async (req, res, next) => {
    try {
        if (!req.user) {
            next(errorResponse(404, "Error with Access Token, no user found"))
            return
        }
        res.status(200).json({ user: req.user })
    } catch (error) {
        next(error)
    }
}

const getAllUsers = async (req, res, next) => {
    try {
        const users = await UserModel.find();

        if (!users) {
            next(errorResponse(404, "No users found"))
            return
        }

        res.status(200).json({ users: users })
    } catch (error) {
        next(error)
    }
}

const getUserDetails = async (req, res, next) => {
    try {
        const userID = req.params.id;
        // Find user from user ID
        const user = await UserModel.findById(userID);

        // Strip important details from the user
        const userDetails = { _id: user._id, username: user.username, channel: user.channel, createdAt: user.createdAt, subscribers: user.subscribers.length }

        // Add videos Details
        const videos = await VideoModel.find({ userID: user._id })
        userDetails.videos = videos;

        return res.status(200).json({ user: userDetails })
    } catch (error) {
        next(error)
    }
}

const updateUser = async (req, res, next) => {
    try {
        if (!req.user) {
            next(errorResponse(401, "Error with Access Token, no user found"));
            return;
        }

        // Get User from user ID
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }

        const allKeys = Object.keys(req.body);
        const unchangable = [
            "_id",
            "subscribers",
            "password",
            "subscribedChannels",
            "createdAt",
            "updatedAt",
            "likes",
        ];

        // Check uniqueness for username, email, channel
        if (req.body.username && req.body.username !== user.username) {
            const existingUser = await UserModel.findOne({
                username: req.body.username,
                _id: { $ne: user._id },
            });
            if (existingUser) {
                return next(errorResponse(400, "Username already taken"));
            }
        }

        if (req.body.email && req.body.email !== user.email) {
            const existingUser = await UserModel.findOne({
                email: req.body.email,
                _id: { $ne: user._id },
            });
            if (existingUser) {
                return next(errorResponse(400, "Email already registered"));
            }
        }

        if (req.body.channel && req.body.channel !== user.channel) {
            const existingUser = await UserModel.findOne({
                channel: req.body.channel,
                _id: { $ne: user._id },
            });
            if (existingUser) {
                return next(errorResponse(400, "Channel name already in use"));
            }
        }

        // Update fields
        allKeys.forEach((key) => {
            if (unchangable.includes(key)) return;
            user[key] = req.body[key];
        });

        await user.save();

        res.status(200).json({
            msg: "User updated successfully",
            user: user,
        });
    } catch (error) {
        return next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        if (!req.user) {
            next(errorResponse(401, "Error with Access Token, no user found"))
            return
        }

        // Get User from user ID and delete
        const deletedUser = await UserModel.findByIdAndDelete(req.user._id);

        res.status(200).json({ msg: "User Deleted successfully", deleted: deletedUser })
    } catch (error) {
        return next(error)
    }
}

// ___________________________  User Channel Operations  __________________________

const subscribeChannel = async (req, res, next) => {
    try {
        // Validate User
        if (!req.user) {
            return next(errorResponse(401, "Error with Access Token, no user found"));
        }

        // Get ID of user and the channel to subscribe to
        const userID = mongoose.isValidObjectId(req.user._id) ? new mongoose.Types.ObjectId(req.user._id) : null;
        const channelID = mongoose.isValidObjectId(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null;


        // Find the user from given user id
        const user = await UserModel.findById(userID);
        if (!user) {
            return next(errorResponse(404, "User not found"))
        }

        // Check if user has already subscribed to this channel
        if (user.subscribedChannels.includes(channelID)) {
            return next(errorResponse(400, "You've already subscribed to this channel"))
        }

        // Check if Subscribing to themselves
        if (userID.toString() == channelID.toString()) {
            return next(errorResponse(400, "You Can't Subscribe to Yourself"))
        }

        // Add the ID of user to subscribing channel
        user.subscribedChannels.push(channelID);
        await user.save();


        // Find the channel to subscribe to by its ID
        const subscribingChannel = await UserModel.findById(channelID);
        if (!subscribingChannel) {
            return next(errorResponse(404, "Channel not found"))
        }

        // Add the user to the list of subscribers of the subscribed channel
        if (!subscribingChannel.subscribers.includes(user._id)) {
            subscribingChannel.subscribers.push(user._id);
            await subscribingChannel.save();
        }
        else {
            return next(errorResponse(400, "You've already subscribed to this channel"))
        }

        res.status(200).json({ msg: "Subscribed to channel", user: user })
    } catch (error) {
        return next(error)
    }
}

const unsubscribeChannel = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(errorResponse(401, "Error with Access Token, no user found"));
        }

        // Validate and convert IDs
        const userID = mongoose.isValidObjectId(req.user._id) ? new mongoose.Types.ObjectId(req.user._id) : null;
        const channelID = mongoose.isValidObjectId(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null;

        if (!userID || !channelID) {
            return next(errorResponse(400, "Invalid User ID or Channel ID format"));
        }

        // Find the user
        const user = await UserModel.findById(userID);
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }

        // Check if user has subscribed to this channel
        if (!user.subscribedChannels.some(id => id.toString() === channelID.toString())) {
            return next(errorResponse(400, "You're not subscribed to this channel"));
        }

        // Remove the channel ID from the user's subscribedChannels array
        user.subscribedChannels = user.subscribedChannels.filter(id => id.toString() !== channelID.toString());
        await user.save();

        // Find the channel to unsubscribe from
        const subscribingChannel = await UserModel.findById(channelID);
        if (!subscribingChannel) {
            return next(errorResponse(404, "Channel not found"));
        }

        // Remove the user ID from the channel's subscribers array
        subscribingChannel.subscribers = subscribingChannel.subscribers.filter(id => id.toString() !== userID.toString());
        await subscribingChannel.save();

        res.status(200).json({ msg: "Unsubscribed from channel", user: user });
    } catch (error) {
        return next(error);
    }
};


module.exports = { test, fetchUser, getAllUsers, getUserDetails, updateUser, deleteUser, subscribeChannel, unsubscribeChannel }