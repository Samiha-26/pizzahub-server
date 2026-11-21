import express from 'express';

const router = express.Router();

const DELIVERY_HUBS = [
  {
    id: 'hub-nyc-little-italy',
    name: 'Little Italy Hearth Hub',
    city: 'New York',
    state: 'NY',
    zipCode: '10013',
    neighborhood: 'Little Italy, Manhattan',
    coverageRadiusMiles: 8,
    estimatedMinutes: '20-30',
    deliveryFee: 3.99,
    freeDeliveryMinimum: 35.0,
    status: 'Operational',
  },
  {
    id: 'hub-nyc-williamsburg',
    name: 'Williamsburg Artisan Oven',
    city: 'Brooklyn',
    state: 'NY',
    zipCode: '11211',
    neighborhood: 'Williamsburg, Brooklyn',
    coverageRadiusMiles: 10,
    estimatedMinutes: '25-35',
    deliveryFee: 3.99,
    freeDeliveryMinimum: 35.0,
    status: 'Operational',
  },
  {
    id: 'hub-sf-north-beach',
    name: 'North Beach Sourdough Station',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94133',
    neighborhood: 'North Beach',
    coverageRadiusMiles: 7,
    estimatedMinutes: '20-30',
    deliveryFee: 4.49,
    freeDeliveryMinimum: 40.0,
    status: 'Operational',
  },
  {
    id: 'hub-chi-west-loop',
    name: 'West Loop Deep & Crispy Hub',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60607',
    neighborhood: 'West Loop',
    coverageRadiusMiles: 9,
    estimatedMinutes: '30-40',
    deliveryFee: 3.99,
    freeDeliveryMinimum: 35.0,
    status: 'Operational',
  },
  {
    id: 'hub-bos-south-end',
    name: 'South End Brick Oven Depot',
    city: 'Boston',
    state: 'MA',
    zipCode: '02118',
    neighborhood: 'South End',
    coverageRadiusMiles: 6,
    estimatedMinutes: '25-35',
    deliveryFee: 3.99,
    freeDeliveryMinimum: 35.0,
    status: 'Operational',
  },
];

router.get('/api/delivery/zones', (req, res) => {
  res.json({
    totalHubs: DELIVERY_HUBS.length,
    hubs: DELIVERY_HUBS,
  });
});

router.post('/api/delivery/estimate', (req, res) => {
  try {
    const { destinationZip, orderSubtotal, preferredHubId } = req.body;

    let selectedHub = DELIVERY_HUBS[0];
    if (preferredHubId) {
      const found = DELIVERY_HUBS.find(h => h.id === preferredHubId);
      if (found) selectedHub = found;
    } else if (destinationZip) {
      const match = DELIVERY_HUBS.find(h => h.zipCode === destinationZip.trim());
      if (match) selectedHub = match;
    }

    const subtotal = Number(orderSubtotal) || 0;
    const isFreeDelivery = subtotal >= selectedHub.freeDeliveryMinimum;
    const finalFee = isFreeDelivery ? 0.0 : selectedHub.deliveryFee;

    res.json({
      hub: selectedHub,
      orderSubtotal: subtotal,
      deliveryFee: finalFee,
      isFreeDelivery,
      freeDeliveryThreshold: selectedHub.freeDeliveryMinimum,
      estimatedMinutes: selectedHub.estimatedMinutes,
      expressDispatchAvailable: true,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute delivery estimate', details: err.message });
  }
});

export default router;
