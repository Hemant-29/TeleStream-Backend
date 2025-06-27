const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.mongoURI;


const connectDB = () => {
    mongoose.connect(uri)
        .then(() => { console.log("Connected to TeleStream Database..."); })
        .catch((err) => { console.error("Error connecting to database:", err); });
}


module.exports = { connectDB };
