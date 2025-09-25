// Basic Auth Example
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Dummy user (untuk contoh)
const user = {
  id: 1,
  username: 'mahasiswa',
  password: 'password123' // Jangan gunakan password plaintext di produksi
};

// Middleware untuk Basic Auth
function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ message: 'Authorization header missing atau bukan Basic' });
  }
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  if (username === user.username && password === user.password) {
    req.user = { id: user.id, username: user.username };
    next();
  } else {
    res.status(401).json({ message: 'Username atau password salah (Basic Auth)' });
  }
}

// Endpoint yang dilindungi Basic Auth
app.get('/basic-protected', basicAuth, (req, res) => {
  res.json({ message: 'Ini adalah data rahasia (Basic Auth)!', user: req.user });
});

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express Basic Auth API',
      version: '1.0.0',
      description: 'API dokumentasi autentikasi Basic Auth',
    },
    components: {
      securitySchemes: {
        basicAuth: {
          type: 'http',
          scheme: 'basic',
        },
      },
    },
    security: [{ basicAuth: [] }],
  },
  apis: ['./basic-auth.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /basic-protected:
 *   get:
 *     summary: Endpoint rahasia, butuh Basic Auth
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Data rahasia (Basic Auth)
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
 *         description: Basic Auth gagal
 */

// ----------------------
// Cara Mengakses Basic Auth API
// ----------------------
//
// 1. Jalankan server:
//    node basic-auth.js
//
// 2. Endpoint yang tersedia:
//    - GET /basic-protected
//      Hanya bisa diakses dengan header Authorization: Basic <base64(username:password)>
//
//    Contoh username & password:
//      username: mahasiswa
//      password: password123
//
//    Cara encode ke base64 (misal di browser/Node.js):
//      Buffer.from('mahasiswa:password123').toString('base64')
//      Hasil: bWFoYXNpc2dhOnBhc3N3b3JkMTIz
//
//    Maka header Authorization:
//      Authorization: Basic bWFoYXNpc2dhOnBhc3N3b3JkMTIz
//
// 3. Contoh request dengan curl:
//    curl -H "Authorization: Basic bWFoYXNpc2dhOnBhc3N3b3JkMTIz" http://localhost:3001/basic-protected
//
// 4. Bisa juga dicoba lewat Swagger UI di http://localhost:3001/api-docs
//    Klik endpoint /basic-protected, lalu klik Authorize, pilih Basic Auth, masukkan username dan password di atas.
//
// ----------------------

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
