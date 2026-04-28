const express = require('express');
const router = express.Router();
const { signup, login, createAdmin } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/create-admin', createAdmin);

module.exports = router;
