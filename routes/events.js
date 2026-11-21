import express from 'express';
import { ordersCol } from '../config/db.js';

const router = express.Router();

router.get('/api/events/hearth-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({
    type: 'CONNECTION_ESTABLISHED',
    message: 'Connected to PizzaHub Live Hearth Dispatch Stream',
    timestamp: new Date().toISOString(),
  });

  const intervalId = setInterval(async () => {
    try {
      const recentOrders = await ordersCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      const hearthTelemetry = {
        type: 'HEARTH_TELEMETRY',
        ovenTemperatureF: Math.floor(860 + Math.random() * 45),
        activeWoodType: 'Kiln-Dried White Oak & Applewood',
        activeBakingCount: recentOrders.filter(o => o.status === 'In Kitchen Hearth').length,
        timestamp: new Date().toISOString(),
      };

      sendEvent(hearthTelemetry);
    } catch (e) {
      clearInterval(intervalId);
    }
  }, 10000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

router.get('/api/events/recent', async (req, res) => {
  try {
    const orders = await ordersCol
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const dispatchEvents = orders.map(order => ({
      orderId: order._id.toString(),
      pizzaTitle: order.pizzaTitle,
      status: order.status || 'Pending',
      location: order.deliveryAddress || order.location || 'New York, NY',
      updatedAt: order.updatedAt || order.createdAt || new Date(),
    }));

    res.json({
      events: dispatchEvents,
      hearthStatus: {
        activeOvens: 3,
        woodFiredTempF: 885,
        avgBakeTimeMinutes: 2.5,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent hearth events', details: err.message });
  }
});

export default router;
