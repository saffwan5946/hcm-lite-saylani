const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hcm_lite';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Successfully connected to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`\n======================================================`);
    console.error(`[MongoDB Connection Error] ${error.message}`);
    console.error(`Target URI: ${mongoUri}`);
    console.error(`\nHOW TO RESOLVE:`);
    console.error(`1. If using local MongoDB:`);
    console.error(`   Open Administrator PowerShell/CMD and run: net start MongoDB`);
    console.error(`2. If using MongoDB Atlas (Cloud):`);
    console.error(`   Add your Atlas URI to backend/.env:`);
    console.error(`   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/hcm_lite`);
    console.error(`======================================================\n`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };

