import express from 'express';
import { usersCol, ordersCol } from '../config/db.js';

const router = express.Router();

router.get('/api/users/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const emailRegex = new RegExp(`^${email}$`, 'i');
    const user = await usersCol.findOne({ email: { $regex: emailRegex } });

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const orderCount = await ordersCol.countDocuments({
      customerEmail: { $regex: emailRegex },
    });

    res.json({
      id: user._id.toString(),
      name: user.name || 'Artisan Foodie',
      email: user.email,
      image: user.image || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      subscriptionTier: user.subscriptionTier || 'free',
      deliveryPreferences: {
        street: user.street || '',
        cityArea: user.cityArea || 'Little Italy, Manhattan, NY',
        postalCode: user.postalCode || '10013',
        instructions: user.instructions || '',
      },
      savedAddresses: user.savedAddresses || [],
      orderCount,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile', details: err.message });
  }
});

router.put('/api/users/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const {
      name,
      phone,
      image,
      street,
      cityArea,
      postalCode,
      instructions,
      savedAddresses,
    } = req.body;

    const emailRegex = new RegExp(`^${email}$`, 'i');

    const updateFields = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (image !== undefined) updateFields.image = image.trim();
    if (street !== undefined) updateFields.street = street.trim();
    if (cityArea !== undefined) updateFields.cityArea = cityArea.trim();
    if (postalCode !== undefined) updateFields.postalCode = postalCode.trim();
    if (instructions !== undefined) updateFields.instructions = instructions.trim();
    if (Array.isArray(savedAddresses)) updateFields.savedAddresses = savedAddresses;

    const result = await usersCol.updateOne(
      { email: { $regex: emailRegex } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const updatedUser = await usersCol.findOne({ email: { $regex: emailRegex } });

    res.json({
      success: true,
      message: 'Profile and delivery preferences updated successfully',
      profile: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        street: updatedUser.street,
        cityArea: updatedUser.cityArea,
        postalCode: updatedUser.postalCode,
        instructions: updatedUser.instructions,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

export default router;
