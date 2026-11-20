import { menuCol, mongoClient } from './config/db.js';
import { initialPizzas } from './seedData.js';

async function seedDatabase() {
  try {
    const existingCount = await menuCol.countDocuments();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing menu items. Refreshing collection...`);
      await menuCol.deleteMany({});
    }

    const result = await menuCol.insertMany(initialPizzas);
    console.log(`Successfully seeded ${result.insertedCount} artisan pizzas into the menu collection.`);
  } catch (error) {
    console.error('Failed to seed menu items:', error);
  } finally {
    await mongoClient.close();
    process.exit(0);
  }
}

seedDatabase();
