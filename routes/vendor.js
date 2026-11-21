import express from 'express';
import { ObjectId } from 'mongodb';
import { menuCol, ordersCol, usersCol } from '../config/db.js';

const router = express.Router();

router.get('/api/vendor/stats/:email', async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    const user = await usersCol.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    const subscriptionTier = user?.subscriptionTier || 'free';
    const itemLimit = subscriptionTier === 'premium' ? null : 3;

    const itemCount = await menuCol.countDocuments({
      vendorEmail: { $regex: new RegExp(`^${email}$`, 'i') },
    });

    const vendorOrders = await ordersCol
      .find({
        $or: [
          { vendorEmail: { $regex: new RegExp(`^${email}$`, 'i') } },
          { vendorId: email },
        ],
      })
      .toArray();

    const effectiveOrders = vendorOrders.length > 0 ? vendorOrders : await ordersCol.find({}).toArray();

    const totalOrders = effectiveOrders.length;
    const pendingOrders = effectiveOrders.filter((o) => o.status === 'pending').length;
    const totalRevenue = effectiveOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    res.json({
      subscriptionTier,
      itemCount,
      itemLimit,
      canAddMore: subscriptionTier === 'premium' || itemCount < 3,
      totalOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch vendor statistics',
      details: err.message,
    });
  }
});

router.get('/api/vendor/menu/:email', async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    const user = await usersCol.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    const subscriptionTier = user?.subscriptionTier || 'free';
    const itemLimit = subscriptionTier === 'premium' ? null : 3;

    const items = await menuCol
      .find({
        vendorEmail: { $regex: new RegExp(`^${email}$`, 'i') },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      items,
      subscriptionTier,
      itemCount: items.length,
      itemLimit,
      canAddMore: subscriptionTier === 'premium' || items.length < 3,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch vendor menu items',
      details: err.message,
    });
  }
});

router.post('/api/vendor/menu', async (req, res) => {
  try {
    const {
      name,
      tagline,
      description,
      price,
      crust,
      category,
      image,
      images,
      ingredients,
      prepTimeMinutes,
      calories,
      badges,
      vendorEmail,
      vendorName,
      vendorAddress,
    } = req.body;

    if (!name || !price || !vendorEmail || !image) {
      return res.status(400).json({
        error: 'Missing required menu fields: name, price, vendorEmail, and image are mandatory',
      });
    }

    const email = vendorEmail.trim().toLowerCase();
    const user = await usersCol.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    if (user && user.status === 'blocked') {
      return res.status(403).json({
        error: 'Your vendor account has been suspended by administration. You cannot publish menu items.',
      });
    }

    const subscriptionTier = user?.subscriptionTier || 'free';

    if (subscriptionTier !== 'premium') {
      const currentCount = await menuCol.countDocuments({
        vendorEmail: { $regex: new RegExp(`^${email}$`, 'i') },
      });

      if (currentCount >= 3) {
        return res.status(403).json({
          error: 'Free tier vendor limit reached (3/3 items). Upgrade to Premium for unlimited hearth slots.',
          code: 'UPGRADE_REQUIRED',
          currentCount,
          limit: 3,
        });
      }
    }

    const parsedIngredients = Array.isArray(ingredients)
      ? ingredients
      : typeof ingredients === 'string'
      ? ingredients.split(',').map((s) => s.trim()).filter(Boolean)
      : ['San Marzano Tomatoes', 'Fior di Latte Mozzarella', 'EVOO'];

    const newPizza = {
      name: name.trim(),
      tagline: tagline ? tagline.trim() : 'Artisan Stone-Baked Creation',
      description: description ? description.trim() : '',
      price: Number(price) || 0,
      crust: crust || 'Neapolitan 48h',
      category: category || 'Wood-Fired',
      image: image.trim(),
      images: Array.isArray(images) && images.length > 0 ? images : [image.trim()],
      ingredients: parsedIngredients,
      prepTimeMinutes: Number(prepTimeMinutes) || 15,
      calories: Number(calories) || 850,
      badges: Array.isArray(badges) && badges.length > 0 ? badges : ['ARTISAN SPECIAL', 'IN PREMIUM WOOD-FIRE'],
      rating: 5.0,
      reviewCount: 0,
      status: 'active',
      vendorId: user?._id?.toString() || `vendor_${Date.now()}`,
      vendorEmail: email,
      vendorName: vendorName ? vendorName.trim() : 'Artisan Pizzeria',
      vendorAddress: vendorAddress ? vendorAddress.trim() : 'PizzaHub Kitchen Hub',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await menuCol.insertOne(newPizza);

    res.status(201).json({
      message: 'Artisan pizza created successfully',
      item: { ...newPizza, _id: result.insertedId },
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to create artisan pizza',
      details: err.message,
    });
  }
});

router.put('/api/vendor/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pizza ID format' });
    }

    const {
      name,
      tagline,
      description,
      price,
      crust,
      category,
      image,
      images,
      ingredients,
      prepTimeMinutes,
      calories,
      badges,
      vendorEmail,
    } = req.body;

    const query = { _id: new ObjectId(id) };
    const existing = await menuCol.findOne(query);

    if (!existing) {
      return res.status(404).json({ error: 'Pizza item not found' });
    }

    if (vendorEmail && existing.vendorEmail) {
      if (existing.vendorEmail.toLowerCase() !== vendorEmail.trim().toLowerCase()) {
        return res.status(403).json({ error: 'Unauthorized to modify this menu item' });
      }
    }

    const parsedIngredients = Array.isArray(ingredients)
      ? ingredients
      : typeof ingredients === 'string'
      ? ingredients.split(',').map((s) => s.trim()).filter(Boolean)
      : existing.ingredients;

    const updateFields = {
      ...(name && { name: name.trim() }),
      ...(tagline !== undefined && { tagline: tagline.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(price !== undefined && { price: Number(price) }),
      ...(crust && { crust }),
      ...(category && { category }),
      ...(image && { image: image.trim() }),
      ...(Array.isArray(images) && images.length > 0 && { images }),
      ingredients: parsedIngredients,
      ...(prepTimeMinutes !== undefined && { prepTimeMinutes: Number(prepTimeMinutes) }),
      ...(calories !== undefined && { calories: Number(calories) }),
      ...(Array.isArray(badges) && { badges }),
      updatedAt: new Date(),
    };

    await menuCol.updateOne(query, { $set: updateFields });

    const updated = await menuCol.findOne(query);

    res.json({
      message: 'Artisan pizza updated successfully',
      item: updated,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to update artisan pizza',
      details: err.message,
    });
  }
});

router.delete('/api/vendor/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pizza ID format' });
    }

    const query = { _id: new ObjectId(id) };
    const existing = await menuCol.findOne(query);

    if (!existing) {
      return res.status(404).json({ error: 'Pizza item not found' });
    }

    await menuCol.deleteOne(query);

    res.json({
      message: 'Artisan pizza deleted successfully',
      id,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to delete artisan pizza',
      details: err.message,
    });
  }
});

router.get('/api/vendor/orders/:email', async (req, res) => {
  try {
    const email = req.params.email.trim().toLowerCase();

    const specificOrders = await ordersCol
      .find({
        $or: [
          { vendorEmail: { $regex: new RegExp(`^${email}$`, 'i') } },
          { vendorId: email },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const orders = specificOrders.length > 0 ? specificOrders : await ordersCol.find({}).sort({ createdAt: -1 }).toArray();

    res.json(orders);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch vendor kitchen orders',
      details: err.message,
    });
  }
});

router.patch('/api/vendor/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await ordersCol.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const now = new Date().toISOString();
    const updatedTimeline = (order.timeline || []).map((step) => {
      if (status === 'preparing') {
        if (step.step === 'Hearth Wood-Firing' || step.step === 'Order Placed') {
          return { ...step, completed: true, time: step.time || now };
        }
      } else if (status === 'on_the_way') {
        if (
          step.step === 'Thermal Transit' ||
          step.step === 'Hearth Wood-Firing' ||
          step.step === 'Order Placed'
        ) {
          return { ...step, completed: true, time: step.time || now };
        }
      } else if (status === 'delivered') {
        return { ...step, completed: true, time: step.time || now };
      }
      return step;
    });

    await ordersCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          timeline: updatedTimeline,
          updatedAt: new Date(),
          ...(status === 'cancelled' && { cancelledAt: now }),
        },
      }
    );

    const updatedOrder = await ordersCol.findOne({ _id: new ObjectId(id) });

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to update order status',
      details: err.message,
    });
  }
});

export default router;
