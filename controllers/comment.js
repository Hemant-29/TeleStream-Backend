const mongoose = require('mongoose')
const commentModel = require('../models/Comment.model');
const errorResponse = require('../utils/errorResponse');
const VideoModel = require('../models/Video.model');

const addComment = async (req, res, next) => {
    try {
        if (!req.user) {
            next(errorResponse(404, "Error with Access Token, no user found"));
        }

        // Find the user ID
        const userID = req.user._id;

        // Find the Video id and then check validity and then find video using it
        const videoID = req.params.videoID;

        if (!mongoose.Types.ObjectId.isValid(videoID)) {
            return next(errorResponse(400, "Invalid video ID"));
        }

        const video = await VideoModel.findById(videoID);
        if (!video) {
            return next(errorResponse(404, "Video Not found"))
        }

        // Find the comment description
        if (!req.body.desc) {
            return next(errorResponse(404, "Comment body not found"))
        }
        const desc = req.body.desc;

        // Add the comment to comment model
        const newComment = new commentModel({
            userID: userID,
            videoID: videoID,
            desc: desc
        })
        await newComment.save();

        res.status(200).json({ msg: "comment added successfully", desc: desc, userID: userID, videoID: videoID });
    } catch (error) {
        next(error);
    }
}

module.exports = { addComment }