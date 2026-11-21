import express from 'express';
import { ObjectId } from 'mongodb';
import { ordersCol, menuCol } from '../config/db.js';

const router = express.Router();

router.post('/api/orders', async (req, res) => {
  try {
    const {
      customerEmail,
      customerName,
      pizzaId,
      pizzaName,
      pizzaImage,
      price,
      quantity = 1,
      totalPrice,
      crust,
      category,
      vendorId,
      vendorName,
      deliveryAddress,
      deliverySchedule,
      bakerNote,
    } = req.body;

    if (!customerEmail || !deliveryAddress) {
      return res.status(400).json({
        error: 'Missing required order details: customerEmail and deliveryAddress are mandatory',
      });
    }

    if (pizzaId && ObjectId.isValid(pizzaId)) {
      const targetPizza = await menuCol.findOne({ _id: new ObjectId(pizzaId) });
      if (targetPizza && targetPizza.vendorEmail) {
        if (targetPizza.vendorEmail.toLowerCase() === customerEmail.trim().toLowerCase()) {
          return res.status(400).json({ error: 'Vendors cannot order their own menu items' });
        }
      }
    }

    const scheduledWindow = deliverySchedule || 'ASAP (25–35 min hearth dispatch)';
    const activeDuplicate = await ordersCol.findOne({
      customerEmail: customerEmail.trim().toLowerCase(),
      pizzaId: pizzaId ? pizzaId.toString() : null,
      deliverySchedule: scheduledWindow,
      status: { $in: ['pending', 'preparing', 'on_the_way'] },
    });

    if (activeDuplicate) {
      return res.status(400).json({
        error: 'You already have an active order for this pizza on the selected delivery schedule',
      });
    }

    const calculatedTotal = totalPrice || (Number(price) || 0) * (Number(quantity) || 1);

    const newOrder = {
      customerEmail: customerEmail.trim().toLowerCase(),
      customerName: customerName || 'Pizza Enthusiast',
      pizzaId: pizzaId ? pizzaId.toString() : null,
      pizzaName: pizzaName || 'Artisan Pizza',
      pizzaImage: pizzaImage || '',
      price: Number(price) || 0,
      quantity: Number(quantity) || 1,
      totalPrice: Number(calculatedTotal),
      crust: crust || 'Neapolitan 48h',
      category: category || 'Wood-Fired',
      vendorId: vendorId || 'vendor_artisan_01',
      vendorName: vendorName || 'Forno Antico Pizzeria',
      deliveryAddress: deliveryAddress.trim(),
      deliverySchedule: deliverySchedule || 'ASAP (25–35 min hearth dispatch)',
      bakerNote: bakerNote ? bakerNote.trim() : '',
      status: 'pending',
      timeline: [
        {
          step: 'Order Placed',
          time: new Date().toISOString(),
          completed: true,
        },
        {
          step: 'Hearth Wood-Firing',
          time: null,
          completed: false,
        },
        {
          step: 'Thermal Transit',
          time: null,
          completed: false,
        },
        {
          step: 'Delivered Hot',
          time: null,
          completed: false,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await ordersCol.insertOne(newOrder);

    res.status(201).json({
      success: true,
      message: 'Artisan order placed successfully',
      insertedId: result.insertedId,
      order: { ...newOrder, _id: result.insertedId },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to place order',
      details: error.message,
    });
  }
});

router.post('/orders', async (req, res) => {
  req.url = '/api/orders';
  router.handle(req, res);
});

router.get('/api/orders/my-orders/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const orders = await ordersCol
      .find({ customerEmail: email.trim().toLowerCase() })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch customer orders',
      details: error.message,
    });
  }
});

router.get('/my-orders/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const orders = await ordersCol
      .find({ customerEmail: email.trim().toLowerCase() })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await ordersCol.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});

router.patch('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await ordersCol.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot cancel an order that is currently in '${order.status}' state. Only pending orders can be cancelled.`,
      });
    }

    const result = await ordersCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order', details: error.message });
  }
});

export default router;
