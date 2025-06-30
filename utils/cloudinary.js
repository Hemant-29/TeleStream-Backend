const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const process = require('process');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.Cloudinary_Cloud_Name,
    api_key: process.env.Cloudinary_Api_Key,
    api_secret: process.env.Cloudinary_Api_Secret
});

const uploadBufferToCloudinary = (buffer, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const options = {
            folder,
            resource_type: resourceType,
            timeout: 10 * 60 * 1000, // 10 minutes
        };

        // Only add HLS transformation for videos
        if (resourceType === 'video') {
            options.eager = [
                { streaming_profile: "full_hd", format: "m3u8" }
            ];
            options.eager_async = true; // don't for HLS to finish
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};



module.exports = uploadBufferToCloudinary;