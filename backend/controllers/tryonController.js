const tryonService = require('../services/tryonService');
const fs = require('fs');

const processTryOn = async (req, res) => {
    try {
        if (!req.files || !req.files['user_image'] || !req.files['cloth_image']) {
            return res.status(400).json({ success: false, message: 'Both user_image and cloth_image are required.' });
        }

        const userImagePath = req.files['user_image'][0].path;
        const clothImagePath = req.files['cloth_image'][0].path;

        // Call the service to interact with FastAPI
        const imageBuffer = await tryonService.generateTryOn(userImagePath, clothImagePath);

        // Optional: Clean up uploaded files after processing to save space
        fs.unlink(userImagePath, (err) => { if (err) console.error("Failed to delete temp user image", err); });
        fs.unlink(clothImagePath, (err) => { if (err) console.error("Failed to delete temp cloth image", err); });

        // Send back the resulting image
        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);
    } catch (error) {
        console.error('Try-On Controller Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process virtual try-on', error: error.message });
    }
};

module.exports = {
    processTryOn
};
