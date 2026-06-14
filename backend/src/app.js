import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import vehicleRoutes from './routes/vehicles.js';
import employeeRoutes from './routes/employees.js';
import statsRoutes from './routes/stats.js';
import { ApiError } from './lib/http.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/stats', statsRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // Centralized error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
