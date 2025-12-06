import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contact.js';
import reportsRoutes from './routes/reports.js';
import datasetRoutes from './routes/dataset.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
let PORT = process.env.PORT || 5000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visioroute';
const MONGODB_URI_FALLBACK = process.env.MONGODB_URI_FALLBACK || '';
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Resolve dataset root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_ROOT = path.resolve(__dirname, 'models', 'pothol_backend-main', 'backened', 'dataset');

// CORS whitelist
const corsWhitelist = new Set([ORIGIN, 'http://localhost:3001']);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsWhitelist.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use('/static/dataset', express.static(DATASET_ROOT));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/dataset', datasetRoutes);

// ----------- FIXED DATABASE CONNECTION LOGIC -------------
async function connectDB() {
  const dbName = process.env.DB_NAME || 'visioroute';

  try {
    await mongoose.connect(MONGODB_URI, { dbName });
    console.log("Connected to MongoDB (primary)");
    return true;
  } catch (err) {
    console.error("Primary MongoDB error:", err.message);
  }

  if (MONGODB_URI_FALLBACK) {
    try {
      await mongoose.connect(MONGODB_URI_FALLBACK, { dbName });
      console.log("Connected to MongoDB (fallback)");
      return true;
    } catch (err2) {
      console.error("Fallback MongoDB error:", err2.message);
    }
  }

  console.warn("⚠ Warning: No MongoDB connection established. Server will continue to run without a database.");
  return false;
}

// ----------- FIXED SERVER STARTUP (NO CRASHING) ------------
function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${PORT} in use. Trying next port...`);
      PORT++;
      startServer();
    } else {
      console.error("Server error:", err);
    }
  });
}

// ----------- START APP --------------------------------------
async function start() {
  await connectDB(); // May fail, but server still starts
  startServer();
}

start();
