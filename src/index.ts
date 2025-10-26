import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './api/index.js';
import proxyRoutes from './api/routes/proxy.js';

// Load .env.local in development, .env in production
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local' });

const app = express();
const PORT = process.env['PORT'] || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('RunTime API Monitoring Backend is running!');
});

// All our API logic will be handled here
app.use('/api', apiRoutes); 

app.use('/proxy', proxyRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});