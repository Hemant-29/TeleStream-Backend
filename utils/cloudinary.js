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
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });

};

module.exports = uploadBufferToCloudinary;