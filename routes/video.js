const express = require("express");
const router = express.Router();
const upload = require('../middlewares/multerUpload');

// Import Controllers 
const { uploadVideo, playVideo, deleteVideo, getAllVideos, getAllComments, searchByTitle, getVideoDetails, likeVideo, addView } = require("../controllers/video");
const authenticateUser = require("../middlewares/authenticateUser");

// Video Routes
router.get('/all', getAllVideos);
router.post("/upload", upload.fields([{ name: 'thumbnail', maxcount: 1 }, { name: 'video', maxcount: 1 }]), authenticateUser, uploadVideo);
router.get('/play', playVideo);
router.delete('/delete/:id', authenticateUser, deleteVideo);
router.get('/comments/:id', getAllComments);
router.get('/search', searchByTitle);
router.get('/:id', getVideoDetails);
router.post('/like/:id', authenticateUser, likeVideo)
router.post('/view/:id', addView);
module.exports = router;