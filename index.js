import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import menuRouter from './routes/menu.js';
import ordersRouter from './routes/orders.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('PizzaHub server is running!');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pizzahub-backend-api',
    uptime: `${Math.round(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

app.use(menuRouter);
app.use(ordersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl} on PizzaHub Server`,
  });
});

app.use((err, req, res, next) => {
  console.error('Server Internal Error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on PizzaHub Server',
  });
});

app.listen(port, () => {
  console.log(`PizzaHub server is running on port ${port}`);
});
