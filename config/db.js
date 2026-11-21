import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URL;
const dbName = process.env.DB_NAME || 'pizzahub';

if (!uri) {
  throw new Error('Missing MONGODB_URL in environment variables');
}

const client = new MongoClient(uri);

let db = null;
let menuCollection = null;
let ordersCollection = null;
let usersCollection = null;
let reviewsCollection = null;
let paymentsCollection = null;

export async function connectToMongoDB() {
  if (db) {
    return {
      client,
      db,
      menuCollection,
      ordersCollection,
      usersCollection,
      reviewsCollection,
      paymentsCollection,
    };
  }

  try {
    await client.connect();
    console.log('Connected to PizzaHub MongoDB database successfully');
    db = client.db(dbName);
    menuCollection = db.collection('menu');
    ordersCollection = db.collection('orders');
    usersCollection = db.collection('user');
    reviewsCollection = db.collection('reviews');
    paymentsCollection = db.collection('payments');

    return {
      client,
      db,
      menuCollection,
      ordersCollection,
      usersCollection,
      reviewsCollection,
      paymentsCollection,
    };
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    throw err;
  }
}

const connection = await connectToMongoDB();
export const mongoClient = connection.client;
export const mongoDb = connection.db;
export const menuCol = connection.menuCollection;
export const ordersCol = connection.ordersCollection;
export const usersCol = connection.usersCollection;
export const reviewsCol = connection.reviewsCollection;
export const paymentsCol = connection.paymentsCollection;
