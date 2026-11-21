import { menuCol, mongoClient } from './config/db.js';

async function updateLocations() {
  try {
    const r1 = await menuCol.updateMany(
      { $or: [{ vendorAddress: /Dhaka|Gulshan/i }, { location: /Dhaka|Gulshan/i }] },
      { $set: { vendorAddress: 'Little Italy, Manhattan, NY', location: 'Little Italy, Manhattan, NY' } }
    );

    const r2 = await menuCol.updateMany(
      { $or: [{ vendorAddress: /Banani/i }, { location: /Banani/i }] },
      { $set: { vendorAddress: 'Williamsburg, Brooklyn, NY', location: 'Williamsburg, Brooklyn, NY' } }
    );

    const r3 = await menuCol.updateMany(
      { $or: [{ vendorAddress: /Dhanmondi/i }, { location: /Dhanmondi/i }] },
      { $set: { vendorAddress: 'North Beach, San Francisco, CA', location: 'North Beach, San Francisco, CA' } }
    );

    console.log(`Updated locations successfully: ${r1.modifiedCount + r2.modifiedCount + r3.modifiedCount} pizzas updated.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoClient.close();
    process.exit(0);
  }
}

updateLocations();
