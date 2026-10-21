import express from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Disable caching on API routes
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // API routes
  app.use('/api', apiRouter);

  // Fallback for unmatched API routes
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  const distPath = path.join(__dirname, 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexHtmlPath)) {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }));
    app.get('*', (_req, res) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(indexHtmlPath);
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to mount Vite middleware:', e);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FFC Cricket server running on port ${PORT}`);
  });
}

startServer();
