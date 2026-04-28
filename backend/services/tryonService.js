const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Sends images to the FastAPI Try-On service and returns the result.
 * 
 * @param {string} userImagePath - Path to the user's uploaded image.
 * @param {string} clothImagePath - Path to the clothing image.
 * @returns {Promise<Buffer>} - The generated try-on image as a buffer.
 */
const generateTryOn = async (userImagePath, clothImagePath) => {
    try {
        const form = new FormData();
        
        // Append files
        form.append('user_image', fs.createReadStream(userImagePath));
        form.append('cloth_image', fs.createReadStream(clothImagePath));

        // Connect to FastAPI service (default running on port 8000)
        const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000/tryon';

        const response = await axios.post(FASTAPI_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            responseType: 'arraybuffer' // We expect an image buffer back
        });

        return response.data;
    } catch (error) {
        console.error('Error in tryonService calling FastAPI:', error.message);
        throw new Error('Failed to process virtual try-on');
    }
};

module.exports = {
    generateTryOn
};
