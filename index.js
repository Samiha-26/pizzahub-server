import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;

// Global Middleware
app.use(express.json());
app.use(cors());

// Test Route
app.get('/', (req, res) => {
  res.send('PizzaHub server is running!');
});

app.listen(port, () => {
  console.log(`PizzaHub server is running on port ${port}`);
});
