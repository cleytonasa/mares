import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const DATA_FILE = path.join(process.cwd(), 'annotations_fleet.json');

  let annotationsData: unknown[] = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        annotationsData = parsed;
      }
    }
  } catch (e) {
    console.error('Error reading annotations file:', e);
    annotationsData = [];
  }

  // API Routes FIRST
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/annotations', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(annotationsData);
  });

  app.post('/api/annotations', (req, res) => {
    const list = Array.isArray(req.body) ? req.body : req.body?.annotations;
    if (Array.isArray(list)) {
      annotationsData = list;
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(annotationsData, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error writing annotations file:', err);
      }
      return res.json({ success: true, count: annotationsData.length, data: annotationsData });
    }
    return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
  });

  app.delete('/api/annotations', (_req, res) => {
    annotationsData = [];
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
    } catch (err) {
      console.error('Error clearing annotations file:', err);
    }
    return res.json({ success: true, count: 0, data: [] });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Maritime Server running on http://localhost:${PORT}`);
  });
}

startServer();
