import {
  menuCol,
  ordersCol,
  usersCol,
  reviewsCol,
  paymentsCol,
  mongoClient,
} from '../config/db.js';

async function createDatabaseIndexes() {
  try {
    console.log('Building high-performance database indexes for PizzaHub...');

    await menuCol.createIndex({ category: 1 });
    await menuCol.createIndex({ vendorEmail: 1 });
    await menuCol.createIndex({ rating: -1 });
    await menuCol.createIndex({ title: 'text', description: 'text' });
    console.log('Indexed menu collection (category, vendorEmail, rating, full-text)');

    await ordersCol.createIndex({ customerEmail: 1 });
    await ordersCol.createIndex({ vendorEmail: 1 });
    await ordersCol.createIndex({ createdAt: -1 });
    await ordersCol.createIndex({ status: 1 });
    console.log('Indexed orders collection (customerEmail, vendorEmail, createdAt, status)');

    await reviewsCol.createIndex({ pizzaId: 1 });
    await reviewsCol.createIndex({ createdAt: -1 });
    console.log('Indexed reviews collection (pizzaId, createdAt)');

    await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log('Indexed user collection (email unique)');

    await paymentsCol.createIndex({ sessionId: 1 });
    await paymentsCol.createIndex({ userEmail: 1 });
    console.log('Indexed payments collection (sessionId, userEmail)');

    console.log('All PizzaHub database indexes created successfully.');
  } catch (err) {
    console.error('Failed to create indexes:', err);
  } finally {
    await mongoClient.close();
    process.exit(0);
  }
}

createDatabaseIndexes();
