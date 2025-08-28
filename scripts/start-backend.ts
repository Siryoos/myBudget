#!/usr/bin/env tsx

import { createServer } from 'http';
import { parse } from 'url';

import next from 'next';

import { validateJWTSecret } from '@/lib/auth';

// Validate JWT_SECRET before starting the server
validateJWTSecret();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3001', 10);

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url!, true);

      // Only handle API routes
      if (parsedUrl.pathname?.startsWith('/api/')) {
        await handle(req, res, parsedUrl);
      } else {
        // For non-API routes, return HTTP_NOT_FOUND
        res.statusCode = HTTP_NOT_FOUND;
        res.end('Not Found');
      }
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = HTTP_INTERNAL_SERVER_ERROR;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
    });
});
