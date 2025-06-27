const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    videoID: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    desc: { type: String, default: "" }
}, { timestamps: true }
)

const commentModel = mongoose.model("Comment", commentSchema);
module.exports = commentModel