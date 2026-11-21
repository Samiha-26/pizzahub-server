import express from 'express';
import { ObjectId } from 'mongodb';
import { usersCol, menuCol, ordersCol, paymentsCol } from '../config/db.js';

const router = express.Router();

router.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await usersCol.countDocuments();
    const totalVendors = await usersCol.countDocuments({ role: 'vendor' });
    const totalCustomers = await usersCol.countDocuments({ role: 'customer' });
    const totalPizzas = await menuCol.countDocuments();
    const totalOrders = await ordersCol.countDocuments();

    const completedOrders = await ordersCol.find({ status: { $in: ['delivered', 'completed'] } }).toArray();
    const ordersRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    const subscriptionPayments = await paymentsCol.find({ status: 'completed' }).toArray();
    const subscriptionRevenue = subscriptionPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalRevenue = ordersRevenue + subscriptionRevenue;

    res.json({
      totalUsers,
      totalVendors,
      totalCustomers,
      totalPizzas,
      totalOrders,
      ordersRevenue: Number(ordersRevenue.toFixed(2)),
      subscriptionRevenue: Number(subscriptionRevenue.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform metrics', details: err.message });
  }
});

router.get('/api/admin/users', async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      filter.role = role.toLowerCase();
    }

    if (status && status !== 'all') {
      filter.status = status.toLowerCase();
    }

    const users = await usersCol.find(filter).sort({ createdAt: -1 }).toArray();

    const mappedUsers = users.map(u => ({
      id: u._id.toString(),
      name: u.name || 'Anonymous Artisan',
      email: u.email,
      role: u.role || 'customer',
      status: u.status || 'active',
      subscriptionTier: u.subscriptionTier || 'free',
      createdAt: u.createdAt || new Date(),
      image: u.image || null,
    }));

    res.json(mappedUsers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch platform users', details: err.message });
  }
});

router.patch('/api/admin/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!['active', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or blocked' });
    }

    const result = await usersCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: `User status changed to ${status}`, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status', details: err.message });
  }
});

router.patch('/api/admin/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!['customer', 'vendor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be customer, vendor, or admin' });
    }

    const result = await usersCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: `User role changed to ${role}`, role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role', details: err.message });
  }
});

router.get('/api/admin/menu', async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (search && search.trim()) {
      filter.$or = [
        { itemName: { $regex: search.trim(), $options: 'i' } },
        { vendorName: { $regex: search.trim(), $options: 'i' } },
        { location: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    const items = await menuCol.find(filter).sort({ createdAt: -1 }).toArray();

    const mapped = items.map(item => ({
      id: item._id.toString(),
      itemName: item.itemName || 'Untitled Pizza',
      category: item.category || 'Specialty',
      price: Number(item.price) || 0,
      vendorName: item.vendorName || 'Artisan Hearth Pizzeria',
      vendorEmail: item.vendorEmail || '',
      location: item.location || 'Little Italy, Manhattan, NY',
      image: item.image || '/images/pizza-margherita.jpg',
      badge: item.badge || null,
      moderationStatus: item.moderationStatus || 'approved',
      createdAt: item.createdAt || new Date(),
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch moderation menu', details: err.message });
  }
});

router.patch('/api/admin/menu/:id/moderation', async (req, res) => {
  try {
    const { id } = req.params;
    const { moderationStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    if (!['approved', 'flagged', 'hidden'].includes(moderationStatus)) {
      return res.status(400).json({ error: 'Moderation status must be approved, flagged, or hidden' });
    }

    const result = await menuCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { moderationStatus, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ success: true, message: `Recipe marked as ${moderationStatus}`, moderationStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update recipe moderation', details: err.message });
  }
});

router.delete('/api/admin/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    const result = await menuCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ success: true, message: 'Recipe removed by administrator' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete menu item', details: err.message });
  }
});

export default router;
