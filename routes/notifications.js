import express from 'express';
import { ObjectId } from 'mongodb';
import { notificationsCol } from '../config/db.js';

const router = express.Router();

router.get('/api/notifications/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const emailQuery = { recipientEmail: { $regex: new RegExp(`^${email}$`, 'i') } };
    const notifications = await notificationsCol
      .find(emailQuery)
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    if (notifications.length === 0) {
      const welcomeNotification = {
        recipientEmail: email.toLowerCase(),
        title: 'Welcome to PizzaHub Artisanal Hearth',
        message: 'Your wood-fired artisanal journey has begun. Discover authentic 72-hour sourdough pies crafted by master pizzaiolos.',
        type: 'system',
        read: false,
        createdAt: new Date(),
      };
      const result = await notificationsCol.insertOne(welcomeNotification);
      return res.json({
        notifications: [{ ...welcomeNotification, _id: result.insertedId }],
        unreadCount: 1,
      });
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

router.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const result = await notificationsCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { read: true, readAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification', details: err.message });
  }
});

router.patch('/api/notifications/read-all/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const result = await notificationsCol.updateMany(
      { recipientEmail: { $regex: new RegExp(`^${email}$`, 'i') }, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all notifications as read', details: err.message });
  }
});

router.post('/api/notifications', async (req, res) => {
  try {
    const { recipientEmail, title, message, type, orderId } = req.body;

    if (!recipientEmail || !title || !message) {
      return res.status(400).json({ error: 'recipientEmail, title, and message are required' });
    }

    const newNotification = {
      recipientEmail: recipientEmail.trim().toLowerCase(),
      title: title.trim(),
      message: message.trim(),
      type: type || 'order',
      orderId: orderId || null,
      read: false,
      createdAt: new Date(),
    };

    const result = await notificationsCol.insertOne(newNotification);

    res.status(201).json({
      success: true,
      notificationId: result.insertedId,
      notification: newNotification,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification', details: err.message });
  }
});

export default router;
