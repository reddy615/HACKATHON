const { spawn } = require('child_process');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('./src/config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Product = require('./src/models/Product');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.PORT = '5017';
  process.env.JWT_SECRET = 'phase10-smoke-secret';
  process.env.NODE_ENV = 'test';
  await connectDB();

  const serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname),
    env: { ...process.env, MONGODB_URI: mongod.getUri(), PORT: '5017', JWT_SECRET: 'phase10-smoke-secret', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  serverProcess.stdout.on('data', (chunk) => { output += chunk.toString(); });
  serverProcess.stderr.on('data', (chunk) => { output += chunk.toString(); console.log('STDERR', chunk.toString()); });

  const waitForServer = async (timeoutMs = 30000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      try {
        const response = await fetch('http://127.0.0.1:5017/health');
        if (response.ok) return;
      } catch (error) {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Server did not start: ' + output);
  };

  await waitForServer();
  const password = 'secure-password-123';
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ name: 'Smoke', email: 'smoke@example.com', password: hashedPassword, role: 'customer' });
  const product = await Product.create({ name: 'Headphones', description: 'd', price: 149.99, stock: 12, category: 'electronics' });

  const register = await fetch('http://127.0.0.1:5017/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke User', email: 'smoke-user@example.com', password: 'smoke-pass-123' }),
  });
  const loginBody = await register.json();
  console.log('register', register.status, JSON.stringify(loginBody));
  const token = loginBody.data.token;
  const payload = { productId: product._id.toString(), quantity: 2 };
  console.log('payload', payload);
  const cartRes = await fetch('http://127.0.0.1:5017/api/carts/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(payload),
  });
  console.log('cart status', cartRes.status);
  console.log('cart body', await cartRes.text());

  serverProcess.kill('SIGTERM');
  await mongoose.disconnect();
  await mongod.stop();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
