const express = require('express');
const router = express.Router();
const tryonController = require('../controllers/tryonController');
const multer = require('multer');
const path = require('path');

// Configure multer to save files temporarily
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Define fields expected from the frontend
const tryonUploads = upload.fields([
    { name: 'user_image', maxCount: 1 },
    { name: 'cloth_image', maxCount: 1 }
]);

// POST /api/tryon
router.post('/', tryonUploads, tryonController.processTryOn);

module.exports = router;
