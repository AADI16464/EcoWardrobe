require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/authRoutes');
const tryonRoutes = require('./routes/tryonRoutes');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tryon', tryonRoutes);


// Health check
app.get('/', (req, res) => {
  res.json({ message: '🌿 EcoWardrobe API is running', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🌿 EcoWardrobe Backend running on http://localhost:${PORT}`);
  console.log(`📦 API Base: http://localhost:${PORT}/api`);
});

module.exports = app;
