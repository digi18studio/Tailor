const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

// Generate static productsData.js on startup
try {
  const generator = require('./generateProductsData');
  const content = generator.generateScriptContent(path.join(__dirname, 'images'));
  fs.writeFileSync(path.join(__dirname, 'productsData.js'), content);
  console.log('Dynamic productsData.js written to disk on startup.');
} catch (err) {
  console.error('Failed to generate productsData.js on startup:', err);
}

const server = http.createServer((req, res) => {
  // Decode URL to handle spaces or special characters in filenames
  const decodedUrl = decodeURIComponent(req.url);
  
  // Handle productsData.js request dynamically
  if (decodedUrl === '/productsData.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    try {
      delete require.cache[require.resolve('./generateProductsData')];
      const generator = require('./generateProductsData');
      const content = generator.generateScriptContent(path.join(__dirname, 'images'));
      res.end(content);
    } catch (err) {
      console.error('Error generating productsData.js dynamically:', err);
      fs.readFile(path.join(__dirname, 'productsData.js'), (err2, staticContent) => {
        if (err2) {
          res.statusCode = 500;
          res.end('Server Error');
        } else {
          res.end(staticContent);
        }
      });
    }
    return;
  }

  // Handle POST upload request for measurement photos
  if (req.method === 'POST' && decodedUrl === '/upload') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.image) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No image data provided' }));
          return;
        }
        const base64Data = payload.image.replace(/^data:image\/\w+;base64,/, "");
        const match = payload.image.match(/^data:image\/(\w+);base64,/);
        const ext = match ? match[1] : 'png';
        const filename = `measurement_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, 'uploads');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir);
        }
        
        fs.writeFileSync(path.join(uploadDir, filename), base64Data, { encoding: 'base64' });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          url: `/uploads/${filename}` 
        }));
      } catch (err) {
        console.error('Upload error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  let filePath = path.join(__dirname, decodedUrl === '/' ? 'Index.html' : decodedUrl);
  
  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('File Not Found');
      } else {
        res.statusCode = 500;
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

