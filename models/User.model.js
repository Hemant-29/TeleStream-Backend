const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "A username is required"],
        unique: [true, "This username already exists"]
    },
    channel: {
        type: String,
        required: [true, "A channel name is required"],
        unique: [true, "This channel name already exists"]
    },
    email: {
        type: String,
        required: [true, "An Email is required"],
        unique: [true, "This email ID already exists"],
        match: [/.+\@.+\..+/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: [true, "A password is required"]
    },
    subscribers: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    subscribedChannels: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        default: []
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }]
}, { timestamps: true })

const UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;