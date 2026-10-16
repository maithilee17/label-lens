import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

export async function connectDB(customUri) {
  const uri = customUri || config.mongodbUri;
  
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
}

export async function disconnectDB() {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Disconnected successfully');
  }
}
