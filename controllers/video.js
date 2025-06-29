const mongoose = require("mongoose");
const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

const errorResponse = require("../utils/errorResponse")
const videoModel = require("../models/Video.model");
const UserModel = require("../models/User.model");
const uploadBufferToCloudinary = require("../utils/cloudinary");
const { asyncDisposeSymbol } = require("puppeteer");
const commentModel = require("../models/Comment.model");


// helper to delete a file (and swallow “file not found” errors)
async function safeUnlink(filePath) {
    try {
        await fs.unlink(filePath);
        console.log(`Deleted local file: ${filePath}`);
    } catch (err) {
        // ignore “file not found”
        if (err.code !== 'ENOENT') {
            console.error(`Failed to delete ${filePath}:`, err);
        }
    }
}

// helper to get the public id from the video url
function extractPublicId(url, folderName) {
    // Remove the base Cloudinary URL
    const parts = url.split('/');
    const fileNameWithExt = parts[parts.length - 1];
    const fileName = fileNameWithExt.split('.')[0];  // remove extension

    if (folderName) {
        return `${folderName}/${fileName}`;
    }
    return fileName;
}

// _________________________________Video Routes_________________________________

const getAllVideos = async (req, res, next) => {
    try {
        const videos = await videoModel.find();

        for (let video of videos) {
            const user = await UserModel.findById(video.userID);
            video.userName = user ? (user.channel || user.username) : "Unknown";
        }

        res.status(200).json(videos);
    } catch (error) {
        return next(error);
    }
};


const deleteVideo = async (req, res, next) => {
    try {
        // Getting user from the User Authentication
        if (!req.user) {
            next(errorResponse(401, "Error with Access Token, no user found"))
            return
        }

        // Get User from user ID
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }

        // Get the video from video Model
        const videoID = req.params.id;
        if (!videoID) {
            return next(errorResponse(400, "No video ID provided"));
        }
        const video = await videoModel.findById(videoID);

        if (!video) {
            return next(errorResponse(404, "Video not found"));
        }

        const videoUrl = video.videoUrl;
        const thumbnailUrl = video.thumbnailUrl;

        // Extract public IDs
        const videoPublicId = extractPublicId(videoUrl, "TeleStream_Videos"); // Your video folder
        const thumbnailPublicId = extractPublicId(thumbnailUrl, "TeleStream_Thumbnails"); // Your thumbnail folder

        // Delete the cloudinary files
        if (videoPublicId) {
            await cloudinary.uploader.destroy(videoPublicId, { resource_type: 'video' });
        }
        if (thumbnailPublicId) {
            await cloudinary.uploader.destroy(thumbnailPublicId, { resource_type: 'image' });
        }

        // Delete the video from video Model database
        await videoModel.findByIdAndDelete(videoID);

        // Respond to the client
        res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
        next(error)
    }
}

const uploadVideo = async (req, res, next) => {
    try {

        // Validate title
        if (!req.body.title || req.body.title.trim() === '') {
            return res.status(400).json({ message: "Video title is required." });
        }

        // Validate uploaded files
        if (!req.files || !req.files['video'] || req.files['video'].length === 0) {
            return res.status(400).json({ message: 'No video file uploaded.' });
        }
        if (!req.files['thumbnail'] || req.files['thumbnail'].length === 0) {
            return res.status(400).json({ message: 'No thumbnail file uploaded.' });
        }

        // Get Video and thumbnail file buffers from RAM
        const videoBuffer = req.files['video'][0].buffer;
        const thumbnailBuffer = req.files['thumbnail'][0].buffer;

        // Getting user from the User Authentication
        if (!req.user) {
            next(errorResponse(401, "Error with Access Token, no user found"))
            return
        }

        // Get User from user ID
        const user = await UserModel.findById(req.user._id);
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }


        // Upload video to Cloudinary
        let uploadedVideo;
        try {
            uploadedVideo = await uploadBufferToCloudinary(videoBuffer, "TeleStream_Videos", "video");
        } catch (error) {
            console.error('Video Upload failed:', error);
            return res.status(500).json({
                msg: "Failed to upload video to Cloud",
                error: error.message
            });
        }


        // Upload thumbnail to Cloudinary
        let uploadedThumbnail;
        try {
            uploadedThumbnail = await uploadBufferToCloudinary(thumbnailBuffer, "TeleStream_Thumbnails");
        } catch (error) {
            return res.status(500).json({
                msg: "Failed to upload thumbnail to Cloud",
                error: error.message
            });
        }

        // Make a new Video Model
        const newVideo = new videoModel({
            userID: user._id,
            userName: user.channel || user.username,
            title: req.body.title,
            description: req.body.description,
            videoUrl: uploadedVideo.eager?.[0]?.secure_url || uploadedVideo.secure_url,
            originalVideoUrl: uploadedVideo.secure_url,
            thumbnailUrl: uploadedThumbnail.secure_url
        });

        console.log("HLS URL:", uploadedVideo.eager?.[0]?.secure_url);

        await newVideo.save();


        // Response
        res.status(201).json({ msg: 'Video uploaded successfully.', video: newVideo });
    } catch (error) {
        next(error)
    }
}


const playVideo = async (req, res) => {
    const range = req.headers.range;
    if (!range) {
        return res.status(400).json({ error: "requires range header to stream video" })
    }

    const clipUrl = req.query.videoUrl;
    if (!clipUrl) {
        return res.status(400).json({ error: "please provide a clipUrl query param" });
    }

    try {

        // Since we now know exactly which bytes to fetch, issue a GET to Cloudinary
        const cloudRes = await axios.get(clipUrl, {
            headers: { Range: range },
            responseType: 'stream'
        })

        // HEAD to get total size
        const head = await axios.head(clipUrl);
        const fileSize = parseInt(head.headers["content-length"], 10);

        // Get the range starting and ending string from the given range by user
        const [fullMatch, startStr, endStr] = range.match(/bytes=(\d+)-(\d*)/);

        // Convert the starting and the ending strings into the integers
        const start = parseInt(startStr, 10);

        // End might be available sometimes and sometimes not
        // const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

        // Calculate how many bytes we need to send: (end − start + 1).
        const MAX_CHUNK_SIZE = 1024 * 1024 * 1; // 1 MiB * X
        const end = Math.min(start + MAX_CHUNK_SIZE - 1, fileSize - 1);
        const chunkSize = end - start + 1;

        // set the HTTP response status to 206 (Partial Content)
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': "video/mp4"
        })

        // pipe the streamed data from cloudinary directly into express
        cloudRes.data.pipe(res);

    } catch (error) {
        res.status(500).json({ error: error })
    }
}

const getAllComments = async (req, res, next) => {
    try {
        // Get Video ID from parameters
        const videoID = req.params.id;

        // Validate videoID
        if (!mongoose.Types.ObjectId.isValid(videoID)) {
            return next(errorResponse(400, "Invalid video ID"));
        }

        // Get all the comments
        const comments = await commentModel.find({ videoID })

        // Make a new list using map function that has all the comments with their usernames
        const commentsWithUserName = await Promise.all(
            comments.map(async (commentDoc) => {
                const user = await UserModel.findById(commentDoc.userID);
                const comment = commentDoc.toObject();
                comment.userName = user ? (user.channel || user.username) : "Unknown";
                return comment;
            })
        );

        res.status(200).json({ comments: commentsWithUserName })
    } catch (error) {
        return next(error)
    }
}

const searchByTitle = async (req, res, next) => {
    try {
        const title = req.query.keyword;

        if (!title || title.trim() === "") {
            return next(errorResponse(400, "Search title is required"));
        }

        const videos = await videoModel.find({ title: { $regex: title, $options: "i" } }) // "i" for case insensitive and partial search

        const users = await UserModel.find({ channel: { $regex: title, $options: "i" } })

        if (videos.length == 0 && users.length == 0) {
            return next(errorResponse(404, "No video or user found with the given title"));
        }
        res.status(200).json({ videos: videos, users: users });
    } catch (error) {
        return next(error)
    }
}

const getVideoDetails = async (req, res, next) => {
    try {
        const videoID = req.params.id;

        let videoDoc = await videoModel.findById(videoID);
        if (!videoDoc) {
            return next(errorResponse(404, "Video not found"));
        }

        // find the user by their User ID
        const userID = videoDoc.userID;
        const user = await UserModel.findById(userID);

        // Convert the video to object from document
        const video = videoDoc.toObject();
        video.userName = user.channel || user.username;

        return res.status(200).json({ video: video });
    } catch (error) {
        return next(error)
    }
}

const likeVideo = async (req, res, next) => {
    try {
        // Getting user ID from User Authentication
        if (!req.user) {
            return next(errorResponse(401, "Error with Access Token, no user found"))
            return
        }
        const userID = req.user._id;

        // Getting the VideoID from params
        const videoID = req.params.id;

        // Validate Video ID
        if (!videoID) {
            return next(errorResponse(400, "No video ID provided"));
        }

        // Fetch user and Video from their IDs
        const user = await UserModel.findById(userID);
        const video = await videoModel.findById(videoID);

        // Validate User and Video
        if (!user) {
            return next(errorResponse(404, "User not found"));
        }

        if (!video) {
            return next(errorResponse(404, "Video not found"));
        }

        // Determine if the user has already liked the video
        const hasLiked = video.likes.includes(userID);

        if (hasLiked) {
            // unlike the video
            await videoModel.findByIdAndUpdate(videoID, {
                $pull: { likes: userID }
            })

            await UserModel.findByIdAndUpdate(userID, {
                $pull: { likes: videoID }
            })

            return res.status(200).json({ msg: "video Unliked successfully", liked: false })
        }
        else {
            // Like the video
            await videoModel.findByIdAndUpdate(videoID, {
                $addToSet: { likes: userID }
            })

            await UserModel.findByIdAndUpdate(userID, {
                $addToSet: { likes: videoID }
            })

            return res.status(200).json({ msg: "video liked successfully", liked: true })
        }

    } catch (error) {
        return next(error)
    }
}

const addView = async (req, res, next) => {
    try {
        // Get the video ID
        const videoID = req.params.id;

        // Add the view count using $inc operator
        const updated = await videoModel.findByIdAndUpdate(
            videoID,
            { $inc: { views: 1 } },
            { new: true }
        );

        // Validate Video
        if (!updated) {
            return res.status(404).json({ msg: "Video not found" });
        }

        const video = await videoModel.findById(videoID);

        return res.status(200).json({ msg: "view added successfully", video: video });
    } catch (error) {
        return next(error)
    }
}

module.exports = { uploadVideo, playVideo, deleteVideo, getAllVideos, getAllComments, searchByTitle, getVideoDetails, likeVideo, addView };