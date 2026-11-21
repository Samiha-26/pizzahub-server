import express from 'express';
import { ObjectId } from 'mongodb';
import { ordersCol, menuCol } from '../config/db.js';

const router = express.Router();

router.get('/api/orders/:id/invoice', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await ordersCol.findOne({ _id: new ObjectId(id) });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let pizzaDetails = null;
    if (order.pizzaId && ObjectId.isValid(order.pizzaId)) {
      pizzaDetails = await menuCol.findOne({ _id: new ObjectId(order.pizzaId) });
    }

    const subtotal = Number(order.totalPrice || 0);
    const taxRate = 0.08875;
    const estimatedTax = Number((subtotal * taxRate).toFixed(2));
    const deliveryFee = subtotal > 35 ? 0.0 : 3.99;
    const finalGrandTotal = Number((subtotal + estimatedTax + deliveryFee).toFixed(2));

    const invoiceData = {
      invoiceNumber: `PH-${order._id.toString().slice(-6).toUpperCase()}`,
      orderId: order._id.toString(),
      issuedAt: order.createdAt || new Date(),
      status: order.status || 'Pending',
      paymentStatus: 'Paid via Stripe / Card on Dispatch',
      currency: 'USD',
      customer: {
        name: order.customerName || 'Artisan Foodie',
        email: order.customerEmail,
        phone: order.customerPhone || 'Not provided',
        deliveryAddress: order.deliveryAddress || order.location || 'Little Italy, Manhattan, NY',
      },
      vendor: {
        name: order.vendorName || pizzaDetails?.vendorName || 'Artisan Wood-Fired Hearth',
        email: order.vendorEmail || pizzaDetails?.vendorEmail || 'hearth@pizzahub.com',
        location: pizzaDetails?.location || order.location || 'New York, NY',
      },
      item: {
        pizzaTitle: order.pizzaTitle,
        crust: order.crust || pizzaDetails?.crust || 'Neapolitan Sourdough',
        hydration: pizzaDetails?.hydration || '75%',
        quantity: Number(order.quantity) || 1,
        unitPrice: Number(order.quantity) > 0 ? Number((subtotal / order.quantity).toFixed(2)) : subtotal,
        total: subtotal,
      },
      pricingSummary: {
        subtotal,
        tax: estimatedTax,
        taxRate: '8.875%',
        deliveryFee,
        grandTotal: finalGrandTotal,
      },
    };

    res.json(invoiceData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve invoice', details: err.message });
  }
});

router.get('/api/invoices/customer/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Customer email is required' });
    }

    const orders = await ordersCol
      .find({ customerEmail: { $regex: new RegExp(`^${email}$`, 'i') } })
      .sort({ createdAt: -1 })
      .toArray();

    const invoices = orders.map(order => ({
      invoiceNumber: `PH-${order._id.toString().slice(-6).toUpperCase()}`,
      orderId: order._id.toString(),
      pizzaTitle: order.pizzaTitle,
      totalPrice: order.totalPrice,
      status: order.status,
      createdAt: order.createdAt,
    }));

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer invoices', details: err.message });
  }
});

export default router;
