import express from 'express';
import { ObjectId } from 'mongodb';
import { menuCol } from '../config/db.js';
import { initialPizzas } from '../seedData.js';

const router = express.Router();

router.get('/pizzas', async (req, res) => {
  try {
    const pizzas = await menuCol.find().toArray();
    res.json(pizzas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pizzas', details: error.message });
  }
});

router.get('/pizza/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pizza ID format' });
    }
    const item = await menuCol.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: 'Pizza not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pizza details', details: error.message });
  }
});

router.get('/api/menu/seed', async (req, res) => {
  try {
    const count = await menuCol.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Menu already populated', count });
    }
    const result = await menuCol.insertMany(initialPizzas);
    res.json({ message: 'Menu seeded successfully', insertedCount: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed menu', details: error.message });
  }
});

router.get('/api/menu/specials', async (req, res) => {
  try {
    const specials = await menuCol
      .find({ isFeatured: true, status: { $in: ['approved', 'active'] } })
      .limit(6)
      .toArray();

    res.json(specials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chef specials', details: error.message });
  }
});

router.get('/api/menu', async (req, res) => {
  try {
    const { search, category, crust, sort, page = 1, limit = 60 } = req.query;

    const query = { status: { $in: ['approved', 'active'] } };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { description: regex },
        { tagline: regex },
        { ingredients: regex },
      ];
    }

    if (category && category !== 'All' && category.trim() !== '') {
      const cleanCat = category.trim();
      if (/wood/i.test(cleanCat)) {
        query.category = /wood-fired/i;
      } else if (/veg/i.test(cleanCat)) {
        query.category = /vegetarian/i;
      } else if (/spic/i.test(cleanCat)) {
        query.category = /spicy/i;
      } else if (/white/i.test(cleanCat)) {
        query.category = /white/i;
      } else if (/classic|italian/i.test(cleanCat)) {
        query.category = /classic/i;
      } else {
        query.category = new RegExp(cleanCat, 'i');
      }
    }

    if (crust && crust !== 'All' && crust.trim() !== '') {
      const cleanCrust = crust.trim();
      if (/neapolitan/i.test(cleanCrust)) {
        query.crust = /neapolitan/i;
      } else if (/roman|thin/i.test(cleanCrust)) {
        query.crust = /roman/i;
      } else if (/detroit|pan/i.test(cleanCrust)) {
        query.crust = /detroit/i;
      } else if (/gluten|cauliflower/i.test(cleanCrust)) {
        query.crust = /gluten-free|cauliflower/i;
      } else if (/sourdough|stuffed/i.test(cleanCrust)) {
        query.crust = /sourdough/i;
      } else {
        query.crust = new RegExp(cleanCrust, 'i');
      }
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'rating-desc') {
      sortOptions = { rating: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const total = await menuCol.countDocuments(query);
    const items = await menuCol
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.json({
      items,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items', details: error.message });
  }
});

router.get('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pizza ID format' });
    }

    const item = await menuCol.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: 'Pizza not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pizza details', details: error.message });
  }
});

export default router;
