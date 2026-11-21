import { menuCol, reviewsCol, mongoClient } from './config/db.js';

const sampleReviews = [
  {
    customerName: 'Marcus Sterling',
    customerEmail: 'marcus.s@example.com',
    rating: 5,
    comment: 'The 72-hour cold fermented crust has incredible leopard spotting. Crispy exterior with an airy crumb.',
  },
  {
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@example.com',
    rating: 5,
    comment: 'The San Marzano tomato sauce balances acidity and sweetness flawlessly. One of the best pies in Manhattan.',
  },
  {
    customerName: 'Julian Thorne',
    customerEmail: 'j.thorne@example.com',
    rating: 4,
    comment: 'Exceptional wood-fired char and fresh mozzarella fior di latte. Arrived piping hot in under 30 minutes.',
  },
  {
    customerName: 'Sophia Lin',
    customerEmail: 'sophia.lin@example.com',
    rating: 5,
    comment: 'Balsamic reduction and fresh basil oil drizzle took this to gourmet restaurant tier. Will order again every Friday.',
  },
  {
    customerName: 'Dominic Ricci',
    customerEmail: 'd.ricci@example.com',
    rating: 5,
    comment: 'Authentic Neapolitan standard. The crust hydration is clearly 75% or higher, perfectly puffed cornicione.',
  },
  {
    customerName: 'Rachel Miller',
    customerEmail: 'rachel.m@example.com',
    rating: 4,
    comment: 'Generous artisanal toppings, fragrant oregano, and zero grease pooling. Highly recommend for pizza connoisseurs.',
  },
  {
    customerName: 'Carlos Mendoza',
    customerEmail: 'carlos.m@example.com',
    rating: 5,
    comment: 'The hot honey drizzle paired with the spicy pepperoni is absolute perfection. Hearth-baked bliss.',
  },
  {
    customerName: 'Aria Montgomery',
    customerEmail: 'aria.m@example.com',
    rating: 5,
    comment: 'Truffle essence was delicate and never overpowering. You can taste the quality of the wild foraged mushrooms.',
  },
];

async function seedReviews() {
  try {
    const pizzas = await menuCol.find({}).toArray();
    if (!pizzas || pizzas.length === 0) {
      console.log('No pizzas found in menu. Run seed first.');
      return;
    }

    await reviewsCol.deleteMany({});

    const reviewsToInsert = [];
    const now = new Date();

    for (let i = 0; i < pizzas.length; i++) {
      const pizza = pizzas[i];
      const pizzaId = pizza._id.toString();

      const r1 = sampleReviews[i % sampleReviews.length];
      const r2 = sampleReviews[(i + 3) % sampleReviews.length];
      const r3 = sampleReviews[(i + 5) % sampleReviews.length];

      const selected = [
        { ...r1, pizzaId, isVerifiedBuyer: true, createdAt: new Date(now.getTime() - (i * 3600000 + 1200000)) },
        { ...r2, pizzaId, isVerifiedBuyer: true, createdAt: new Date(now.getTime() - (i * 7200000 + 4500000)) },
        { ...r3, pizzaId, isVerifiedBuyer: true, createdAt: new Date(now.getTime() - (i * 10800000 + 8900000)) },
      ];

      reviewsToInsert.push(...selected);

      const sumRating = selected.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = Number((sumRating / selected.length).toFixed(1));

      await menuCol.updateOne(
        { _id: pizza._id },
        {
          $set: {
            rating: avgRating,
            reviewCount: selected.length,
          },
        }
      );
    }

    const result = await reviewsCol.insertMany(reviewsToInsert);
    console.log(`Seeded ${result.insertedCount} authentic reviews across ${pizzas.length} pizzas.`);
  } catch (error) {
    console.error('Failed to seed reviews:', error);
  } finally {
    await mongoClient.close();
    process.exit(0);
  }
}

seedReviews();
