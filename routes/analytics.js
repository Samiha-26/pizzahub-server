import express from 'express';
import { ordersCol, menuCol } from '../config/db.js';

const router = express.Router();

router.get('/api/vendor/analytics/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Vendor email is required' });
    }

    const emailRegex = new RegExp(`^${email}$`, 'i');

    const vendorPizzas = await menuCol
      .find({ vendorEmail: { $regex: emailRegex } })
      .toArray();

    const pizzaTitles = vendorPizzas.map(p => p.title);

    const vendorOrders = await ordersCol
      .find({
        $or: [
          { vendorEmail: { $regex: emailRegex } },
          { pizzaTitle: { $in: pizzaTitles } },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const totalOrders = vendorOrders.length;
    const grossRevenue = vendorOrders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? Number((grossRevenue / totalOrders).toFixed(2)) : 0;

    const statusCounts = {
      pending: vendorOrders.filter(o => !o.status || o.status.toLowerCase() === 'pending').length,
      baking: vendorOrders.filter(o => o.status?.toLowerCase().includes('hearth') || o.status?.toLowerCase().includes('kitchen')).length,
      delivering: vendorOrders.filter(o => o.status?.toLowerCase().includes('delivery') || o.status?.toLowerCase().includes('transit')).length,
      delivered: vendorOrders.filter(o => o.status?.toLowerCase().includes('delivered')).length,
    };

    const crustPopularity = {};
    vendorOrders.forEach(order => {
      const crust = order.crust || 'Neapolitan Sourdough';
      crustPopularity[crust] = (crustPopularity[crust] || 0) + (Number(order.quantity) || 1);
    });

    const pizzaSales = {};
    vendorOrders.forEach(order => {
      const title = order.pizzaTitle || 'Signature Pie';
      pizzaSales[title] = (pizzaSales[title] || 0) + (Number(order.quantity) || 1);
    });

    const topSellingPizzas = Object.entries(pizzaSales)
      .map(([title, unitsSold]) => ({ title, unitsSold }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenueMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      dailyRevenueMap[key] = 0;
    }

    vendorOrders.forEach(order => {
      const orderDate = new Date(order.createdAt || Date.now());
      if (orderDate >= sevenDaysAgo) {
        const key = orderDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        if (dailyRevenueMap[key] !== undefined) {
          dailyRevenueMap[key] += Number(order.totalPrice) || 0;
        }
      }
    });

    const revenueTimeline = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({
      date,
      revenue: Number(revenue.toFixed(2)),
    }));

    res.json({
      vendorEmail: email,
      catalogSize: vendorPizzas.length,
      totalOrders,
      grossRevenue: Number(grossRevenue.toFixed(2)),
      averageOrderValue,
      statusCounts,
      topSellingPizzas,
      crustPopularity,
      revenueTimeline,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate vendor analytics', details: err.message });
  }
});

export default router;
