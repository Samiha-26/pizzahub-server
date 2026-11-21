import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import menuRouter from './routes/menu.js';
import ordersRouter from './routes/orders.js';
import vendorRouter from './routes/vendor.js';
import paymentsRouter from './routes/payments.js';
import adminRouter from './routes/admin.js';
import reviewsRouter from './routes/reviews.js';
import invoicesRouter from './routes/invoices.js';
import notificationsRouter from './routes/notifications.js';
import analyticsRouter from './routes/analytics.js';
import profileRouter from './routes/profile.js';
import allergensRouter from './routes/allergens.js';
import couponsRouter from './routes/coupons.js';
import deliveryZonesRouter from './routes/deliveryZones.js';
import eventsRouter from './routes/events.js';
import { verifyToken, optionalToken } from './middlewares/auth.js';
import { securityHeaders, sanitizeInputs, rateLimiter } from './middleware/security.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(securityHeaders);
app.use(rateLimiter({ windowMs: 60000, max: 150 }));
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(sanitizeInputs);
app.use(optionalToken);

app.get('/', (req, res) => {
  res.send('PizzaHub server is running!');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pizzahub-backend-api',
    uptime: `${Math.round(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
    message: 'Access token verified successfully',
  });
});

app.use(menuRouter);
app.use(ordersRouter);
app.use(vendorRouter);
app.use(paymentsRouter);
app.use(adminRouter);
app.use(reviewsRouter);
app.use(invoicesRouter);
app.use(notificationsRouter);
app.use(analyticsRouter);
app.use(profileRouter);
app.use(allergensRouter);
app.use(couponsRouter);
app.use(deliveryZonesRouter);
app.use(eventsRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`PizzaHub server is running on port ${port}`);
  });
}

export default app;
