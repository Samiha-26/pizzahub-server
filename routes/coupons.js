import express from 'express';

const router = express.Router();

const PROMOTIONAL_CAMPAIGNS = [
  {
    code: 'WOODFIRED10',
    discountType: 'percentage',
    value: 10,
    minOrder: 25,
    description: '10% off artisanal wood-fired pies on orders of $25 or more',
    active: true,
  },
  {
    code: 'ARTISAN5',
    discountType: 'fixed',
    value: 5,
    minOrder: 20,
    description: '$5 off your artisan hearth selection on orders of $20 or more',
    active: true,
  },
  {
    code: 'SOURDOUGH20',
    discountType: 'percentage',
    value: 20,
    minOrder: 30,
    description: '20% off premier cold-fermented sourdough pies on orders of $30 or more',
    active: true,
  },
  {
    code: 'FREESHIP',
    discountType: 'shipping',
    value: 3.99,
    minOrder: 20,
    description: 'Free expedited hearth delivery on orders of $20 or more',
    active: true,
  },
];

router.get('/api/coupons/active', (req, res) => {
  const activeCoupons = PROMOTIONAL_CAMPAIGNS
    .filter(c => c.active)
    .map(c => ({
      code: c.code,
      description: c.description,
      minOrder: c.minOrder,
      discountType: c.discountType,
    }));

  res.json({ coupons: activeCoupons });
});

router.post('/api/coupons/validate', (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo coupon code is required' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const campaign = PROMOTIONAL_CAMPAIGNS.find(c => c.code === normalizedCode);

    if (!campaign || !campaign.active) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired promotional code',
      });
    }

    const subtotal = Number(orderTotal) || 0;
    if (subtotal < campaign.minOrder) {
      return res.status(400).json({
        valid: false,
        error: `Order total must be at least $${campaign.minOrder.toFixed(2)} to apply voucher ${campaign.code}`,
        minOrder: campaign.minOrder,
      });
    }

    let discountAmount = 0;
    if (campaign.discountType === 'percentage') {
      discountAmount = Number(((subtotal * campaign.value) / 100).toFixed(2));
    } else if (campaign.discountType === 'fixed') {
      discountAmount = Math.min(campaign.value, subtotal);
    } else if (campaign.discountType === 'shipping') {
      discountAmount = campaign.value;
    }

    const newTotal = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

    res.json({
      valid: true,
      code: campaign.code,
      description: campaign.description,
      discountType: campaign.discountType,
      discountAmount,
      originalTotal: subtotal,
      discountedTotal: newTotal,
      savings: discountAmount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to validate voucher', details: err.message });
  }
});

export default router;
