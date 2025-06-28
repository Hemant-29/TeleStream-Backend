const express = require('express');
const { connectDB } = require('./database/connect');
const userRouter = require('./routes/user.js');
const authRouter = require('./routes/auth.js');
const videoRouter = require('./routes/video.js')
const commentRouter = require('./routes/comment.js')
const errorHandler = require('./middlewares/errorHandler.js');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const port = 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173",
        "https://tele-stream-frontend-cq53.vercel.app",
        "https://tele-stream.vercel.app/"],
    credentials: true
}));


// Home Route
app.get("/", (req, res) => {
    return res.send("hellow")
})

// API Routing
app.use("/api/v1/user", userRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/video", videoRouter)
app.use("/api/v1/comment", commentRouter)

// Error handling Middleware
app.use(errorHandler)

app.listen(port, () => {
    console.log("Server live at: http://localhost:" + port)
    connectDB();
})