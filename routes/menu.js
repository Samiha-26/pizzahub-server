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
      .find({ isFeatured: true, status: 'approved' })
      .limit(6)
      .toArray();

    res.json(specials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chef specials', details: error.message });
  }
});

router.get('/api/menu', async (req, res) => {
  try {
    const { search, category, crust, sort, page = 1, limit = 12 } = req.query;

    const query = { status: 'approved' };

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
      query.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    if (crust && crust !== 'All' && crust.trim() !== '') {
      query.crust = new RegExp(`^${crust.trim()}$`, 'i');
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
