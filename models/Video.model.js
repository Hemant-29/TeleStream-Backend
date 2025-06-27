const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: [true, "A username must be provided"] },
    title: { type: String, required: [true, "Video Title must be provided"] },
    description: { type: String, default: null },
    videoUrl: { type: String, required: true },
    originalVideoUrl: String,
    thumbnailUrl: { type: String, required: true },
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    time: { type: String, default: new Date().toLocaleTimeString() },
    date: { type: Date, default: Date.now },
}, { timestamps: true })

const VideoModel = mongoose.model("Video", VideoSchema);
module.exports = VideoModel;