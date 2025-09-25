// Cookie-based Auth Example
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(cookieParser());

// Dummy user
const user = {
  id: 1,
  username: 'mahasiswa',
  password: 'password123'
};

// Simpan token di memory (untuk demo, seharusnya pakai DB)
const sessionTokens = {};

// Endpoint login, set cookie jika sukses
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === user.username && password === user.password) {
    const token = crypto.randomBytes(24).toString('hex');
    sessionTokens[token] = user.id;
    res.cookie('auth_token', token, { httpOnly: true });
    res.json({ message: 'Login berhasil, cookie diset!' });
  } else {
    res.status(401).json({ message: 'Username atau password salah' });
  }
});

// Middleware verifikasi cookie
function authenticateCookie(req, res, next) {
  const token = req.cookies['auth_token'];
  if (!token || !sessionTokens[token]) {
    return res.status(401).json({ message: 'Cookie auth_token tidak valid' });
  }
  req.userId = sessionTokens[token];
  next();
}

// Endpoint protected
app.get('/protected', authenticateCookie, (req, res) => {
  res.json({ message: 'Ini data rahasia (Cookie Auth)!', userId: req.userId });
});

// Endpoint logout (hapus cookie)
app.post('/logout', (req, res) => {
  const token = req.cookies['auth_token'];
  if (token) delete sessionTokens[token];
  res.clearCookie('auth_token');
  res.json({ message: 'Logout berhasil' });
});

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express Cookie Auth API',
      version: '1.0.0',
      description: 'API dokumentasi autentikasi Cookie-based',
    },
  },
  apis: ['./cookie-auth.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login dan set cookie auth_token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login berhasil, cookie diset
 *       401:
 *         description: Username atau password salah
 *
 * /protected:
 *   get:
 *     summary: Endpoint rahasia, butuh cookie auth_token
 *     responses:
 *       200:
 *         description: Data rahasia (Cookie Auth)
 *       401:
 *         description: Cookie auth_token tidak valid
 *
 * /logout:
 *   post:
 *     summary: Logout dan hapus cookie
 *     responses:
 *       200:
 *         description: Logout berhasil
 */

app.listen(PORT, () => {
  console.log(`Cookie Auth server running on http://localhost:${PORT}`);
});
