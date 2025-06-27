const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const process = require('process');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.Cloudinary_Cloud_Name,
    api_key: process.env.Cloudinary_Api_Key,
    api_secret: process.env.Cloudinary_Api_Secret
});

const uploadToCloudinary = async (filePath, folder, resourceType = 'auto') => {
    try {
        const options = {
            folder,
            resource_type: resourceType,
        };

        // if (resourceType === 'video') {
        //     // Add HLS transformation only for videos

        // }
        const result = await cloudinary.uploader.upload(filePath, options);

        return result; // Returns uploaded file's info
    } catch (error) {
        console.error('Upload failed:', error);
        throw error; // Propagate the error
    }
};

module.exports = uploadToCloudinary