import express from 'express';
import { ObjectId } from 'mongodb';
import { reviewsCol, menuCol } from '../config/db.js';

const router = express.Router();

router.get('/api/reviews/:pizzaId', async (req, res) => {
  try {
    const { pizzaId } = req.params;

    const reviews = await reviewsCol
      .find({ pizzaId })
      .sort({ createdAt: -1 })
      .toArray();

    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(1)) : 5.0;

    const distribution = {
      5: reviews.filter(r => Number(r.rating) === 5).length,
      4: reviews.filter(r => Number(r.rating) === 4).length,
      3: reviews.filter(r => Number(r.rating) === 3).length,
      2: reviews.filter(r => Number(r.rating) === 2).length,
      1: reviews.filter(r => Number(r.rating) === 1).length,
    };

    res.json({
      pizzaId,
      totalReviews,
      averageRating,
      distribution,
      reviews,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pizza reviews', details: err.message });
  }
});

router.post('/api/reviews', async (req, res) => {
  try {
    const { pizzaId, customerName, customerEmail, rating, comment } = req.body;

    if (!pizzaId || !customerEmail || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required review fields' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const newReview = {
      pizzaId,
      customerName: (customerName || 'Artisan Foodie').trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      rating: numRating,
      comment: comment.trim(),
      isVerifiedBuyer: true,
      createdAt: new Date(),
    };

    const insertResult = await reviewsCol.insertOne(newReview);

    const allPizzaReviews = await reviewsCol.find({ pizzaId }).toArray();
    const totalCount = allPizzaReviews.length;
    const sum = allPizzaReviews.reduce((acc, r) => acc + Number(r.rating), 0);
    const newAverage = Number((sum / totalCount).toFixed(1));

    if (ObjectId.isValid(pizzaId)) {
      await menuCol.updateOne(
        { _id: new ObjectId(pizzaId) },
        {
          $set: {
            rating: newAverage,
            reviewCount: totalCount,
            updatedAt: new Date(),
          },
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Review posted successfully',
      reviewId: insertResult.insertedId,
      averageRating: newAverage,
      reviewCount: totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review', details: err.message });
  }
});

export default router;
