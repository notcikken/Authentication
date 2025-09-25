const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Dummy data untuk client terdaftar dan user
const clients = [
  {
    client_id: 'client123',
    client_secret: 'secret123',
    redirect_uris: ['http://localhost:5000/callback']
  }
];
const users = [
  { id: 1, username: 'mahasiswa', password: 'password123' }
];

// Simpan kode otorisasi dan token sementara (seharusnya pakai DB)
const authorizationCodes = {};
const accessTokens = {};
const refreshTokens = {};

// Endpoint otorisasi (user login dan approve)
app.get('/authorize', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;
  const client = clients.find(c => c.client_id === client_id && c.redirect_uris.includes(redirect_uri));
  if (!client) return res.status(400).send('Invalid client or redirect_uri');
  // Untuk demo, langsung login user pertama
  const user = users[0];
  // Generate kode otorisasi
  const code = crypto.randomBytes(16).toString('hex');
  authorizationCodes[code] = { client_id, user_id: user.id };
  // Redirect ke redirect_uri dengan code & state
  const redirectUrl = `${redirect_uri}?code=${code}${state ? `&state=${state}` : ''}`;
  res.redirect(redirectUrl);
});

// Endpoint token (exchange code dengan access_token & refresh_token)
app.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token } = req.body;
  const client = clients.find(c => c.client_id === client_id && c.client_secret === client_secret);
  if (!client) return res.status(400).json({ error: 'Invalid client credentials' });

  if (grant_type === 'authorization_code') {
    const auth = authorizationCodes[code];
    if (!auth || auth.client_id !== client_id) return res.status(400).json({ error: 'Invalid code' });
    // Generate tokens
    const access_token = crypto.randomBytes(24).toString('hex');
    const refresh_token = crypto.randomBytes(24).toString('hex');
    accessTokens[access_token] = { user_id: auth.user_id, client_id };
    refreshTokens[refresh_token] = { user_id: auth.user_id, client_id };
    delete authorizationCodes[code];
    res.json({ access_token, token_type: 'Bearer', expires_in: 3600, refresh_token });
  } else if (grant_type === 'refresh_token') {
    const data = refreshTokens[refresh_token];
    if (!data || data.client_id !== client_id) return res.status(400).json({ error: 'Invalid refresh_token' });
    const access_token = crypto.randomBytes(24).toString('hex');
    accessTokens[access_token] = { user_id: data.user_id, client_id };
    res.json({ access_token, token_type: 'Bearer', expires_in: 3600 });
  } else {
    res.status(400).json({ error: 'Unsupported grant_type' });
  }
});

// Endpoint protected resource
app.get('/profile', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = authHeader.split(' ')[1];
  const data = accessTokens[token];
  if (!data) return res.status(401).json({ error: 'Invalid token' });
  const user = users.find(u => u.id === data.user_id);
  res.json({ id: user.id, username: user.username });
});

// ----------------------
// Cara Menggunakan OAuth Server Ini
// ----------------------
//
// 1. Jalankan server:
//    node oauth-server.js
//
// 2. Mulai alur otorisasi:
//    Buka browser ke:
//    http://localhost:4000/authorize?response_type=code&client_id=client123&redirect_uri=http://localhost:5000/callback
//    Setelah redirect, ambil kode dari URL (contoh: http://localhost:5000/callback?code=xxxx)
//
// 3. Tukar kode dengan access_token (POST ke /token):
//    Bisa menggunakan Swagger UI (lihat di bawah), Postman, atau curl.
//
// 4. Endpoint Swagger UI: http://localhost:4000/api-docs
//    Di sana ada dokumentasi dan tombol untuk mencoba POST /token.
//
// ----------------------

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OAuth Server API',
      version: '1.0.0',
      description: 'Dokumentasi API OAuth sederhana',
    },
  },
  apis: ['./oauth-server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /authorize:
 *   get:
 *     summary: Mulai alur otorisasi OAuth (redirect ke redirect_uri dengan code)
 *     parameters:
 *       - in: query
 *         name: response_type
 *         schema:
 *           type: string
 *         required: true
 *         example: code
 *       - in: query
 *         name: client_id
 *         schema:
 *           type: string
 *         required: true
 *         example: client123
 *       - in: query
 *         name: redirect_uri
 *         schema:
 *           type: string
 *         required: true
 *         example: http://localhost:5000/callback
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       302:
 *         description: Redirect ke redirect_uri dengan code
 *
 * /token:
 *   post:
 *     summary: Tukar code/refresh_token dengan access_token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grant_type:
 *                 type: string
 *                 example: authorization_code
 *               code:
 *                 type: string
 *                 example: kode_dari_authorize
 *               redirect_uri:
 *                 type: string
 *                 example: http://localhost:5000/callback
 *               client_id:
 *                 type: string
 *                 example: client123
 *               client_secret:
 *                 type: string
 *                 example: secret123
 *               refresh_token:
 *                 type: string
 *                 example: refresh_token_jika_refresh
 *     responses:
 *       200:
 *         description: access_token dan refresh_token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 token_type:
 *                   type: string
 *                 expires_in:
 *                   type: integer
 *                 refresh_token:
 *                   type: string
 *       400:
 *         description: Error
 */

app.listen(PORT, () => {
  console.log(`OAuth server running on http://localhost:${PORT}`);
});