const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'HCM Lite API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api', routes);

// Centralized error handler
app.use(errorHandler);

// Connect DB and start HTTP server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`[HCM Lite Server] Running on http://localhost:${env.PORT}`);
    });
    return server;
  } catch (err) {
    console.error('Failed to start server:', err.message);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

