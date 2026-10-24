const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  // If already connected, return existing connection (crucial for Serverless / Vercel)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hcm_lite';

  try {
    cachedConnection = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false
    });
    const conn = await cachedConnection;
    console.log(`[MongoDB] Connected to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    cachedConnection = null;
    console.error(`[MongoDB Connection Error] ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    cachedConnection = null;
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
