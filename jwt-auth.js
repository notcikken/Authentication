// JWT Authentication Example
// Jalankan file ini dengan: node jwt-auth.js
// Endpoint:
// POST /login { username, password } => { token }
// GET /protected (header: Authorization: Bearer <token>) => data rahasia
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SECRET_KEY = 'your_secret_key'; // Ganti dengan secret key yang aman

// Dummy user (untuk contoh)
const user = {
  id: 1,
  username: 'mahasiswa',
  password: 'password123' // Jangan gunakan password plaintext di produksi
};

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express Auth API',
      version: '1.0.0',
      description: 'API dokumentasi autentikasi (JWT)',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./jwt-auth.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint login untuk mendapatkan JWT
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === user.username && password === user.password) {
    // Buat token
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Username atau password salah' });
  }
});

// Middleware untuk verifikasi JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token tidak ditemukan' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// Endpoint yang dilindungi JWT
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Ini adalah data rahasia!', user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login dan dapatkan JWT
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
 *         description: Token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Username atau password salah
 */

/**
 * @swagger
 * /protected:
 *   get:
 *     summary: Endpoint rahasia, butuh JWT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data rahasia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Token tidak ditemukan
 *       403:
 *         description: Token tidak valid
 */
