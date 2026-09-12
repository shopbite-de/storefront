// TLS + HTTP/2 + gzip reverse proxy in front of the Nitro server so that
// Lighthouse sees production-like transport (docs/notes/2026-09-10-issue-273-performance-media.md).
//
//   openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 30 -subj "/CN=localhost"
//   PORT=3099 node --env-file=.env .output/server/index.mjs
//   node scripts/perf/h2-proxy.cjs            # https://localhost:3443 -> :3099
//
// Files in scripts/perf/exp/ are served at /exp/ (static page variants, #319).
// key.pem, cert.pem and exp/ are git-ignored.
const http2 = require('http2');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const upstreamPort = Number(process.env.UPSTREAM_PORT || 3099);
const listenPort = Number(process.env.PORT || 3443);
const server = http2.createSecureServer({
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
  allowHTTP1: true,
});
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', json: 'application/json', woff2: 'font/woff2', webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml' };
server.on('request', (req, res) => {
  if (req.url.startsWith('/exp/')) {
    const file = path.join(__dirname, 'exp', req.url.slice(5).split('?')[0]);
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('nope'); return; }
    const ext = file.split('.').pop(); const body = fs.readFileSync(file);
    const type = types[ext] || 'application/octet-stream';
    if (/text|javascript|json|svg/.test(type)) { res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', 'cache-control': 'no-store' }); res.end(zlib.gzipSync(body)); }
    else { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); }
    return;
  }
  const headers = { ...req.headers };
  delete headers[':method']; delete headers[':path']; delete headers[':scheme']; delete headers[':authority'];
  headers.host = 'localhost:' + upstreamPort;
  headers['accept-encoding'] = 'identity';
  const up = http.request({ host: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers }, (ur) => {
    const h = { ...ur.headers };
    delete h.connection; delete h['transfer-encoding']; delete h['keep-alive'];
    const type = h['content-type'] || '';
    const compressible = /text|javascript|json|xml|svg/.test(type) && !h['content-encoding'];
    if (compressible) { h['content-encoding'] = 'gzip'; delete h['content-length']; }
    res.writeHead(ur.statusCode, h);
    if (compressible) ur.pipe(zlib.createGzip({ level: 6 })).pipe(res); else ur.pipe(res);
  });
  up.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
});
server.listen(listenPort, () => console.log('h2 proxy on https://localhost:' + listenPort + ' -> :' + upstreamPort));
