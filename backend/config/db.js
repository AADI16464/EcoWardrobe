const mongoose = require('mongoose');

const RETRY_DELAY_MS = 5000;

const connectDB = async (retryCount = 0) => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000, // 8 s to find a server
      socketTimeoutMS: 45000,         // 45 s idle socket timeout
    });

    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}\n`);
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);
    console.error(`👉 Retrying in ${RETRY_DELAY_MS / 1000}s... (attempt ${retryCount + 1})`);
    console.error('   Make sure MongoDB is running: run \'mongod\' or start the MongoDB service.\n');
    // Retry without killing the process — backend stays alive
    setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY_MS);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed (SIGINT).');
  process.exit(0);
});

module.exports = connectDB;
