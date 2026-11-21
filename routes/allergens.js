import express from 'express';
import { ObjectId } from 'mongodb';
import { menuCol } from '../config/db.js';

const router = express.Router();

const DIETARY_DEFINITIONS = [
  { id: 'vegetarian', label: 'Vegetarian', description: 'Crafted without meat, poultry, or gelatin' },
  { id: 'vegan', label: '100% Plant-Based', description: 'Free of animal products, eggs, and dairy' },
  { id: 'gluten-friendly', label: 'Gluten-Sensitive', description: 'Made with organic alternative grain dough' },
  { id: 'dairy-free', label: 'Dairy-Free', description: 'Plant-based cheeses or marinara style pies' },
  { id: 'nut-free', label: 'Nut-Free Hearth', description: 'Prepared in a nut-free station' },
  { id: 'cold-fermented', label: '72h Fermented', description: 'Extended cold fermentation for easier digestion' },
  { id: 'organic', label: 'Organic Grains', description: 'Imported stone-milled organic Italian flour' },
];

router.get('/api/menu/dietary-tags', (req, res) => {
  res.json({
    tags: DIETARY_DEFINITIONS,
  });
});

router.get('/api/menu/filter/dietary', async (req, res) => {
  try {
    const { dietary, excludeAllergens, category } = req.query;

    const query = {};

    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const pizzas = await menuCol.find(query).toArray();

    let filtered = pizzas;

    if (dietary) {
      const requiredTags = String(dietary)
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      filtered = filtered.filter(pizza => {
        const pizzaTags = (pizza.dietary || []).map(t => t.toLowerCase());
        const description = (pizza.description || '').toLowerCase();
        const ingredients = (pizza.ingredients || []).map(i => i.toLowerCase());

        return requiredTags.every(reqTag => {
          if (pizzaTags.includes(reqTag)) return true;
          if (reqTag === 'vegetarian' && !pizzaTags.includes('meat') && !ingredients.some(i => i.includes('pepperoni') || i.includes('sausage') || i.includes('prosciutto') || i.includes('pork') || i.includes('beef') || i.includes('bacon'))) {
            return true;
          }
          if (reqTag === 'vegan' && (pizzaTags.includes('vegan') || description.includes('vegan') || pizza.category?.toLowerCase() === 'vegan')) {
            return true;
          }
          if (reqTag === 'cold-fermented' && (pizza.crust?.toLowerCase().includes('ferment') || description.includes('ferment') || pizza.hydration)) {
            return true;
          }
          return false;
        });
      });
    }

    if (excludeAllergens) {
      const excluded = String(excludeAllergens)
        .split(',')
        .map(a => a.trim().toLowerCase())
        .filter(Boolean);

      filtered = filtered.filter(pizza => {
        const ingredients = (pizza.ingredients || []).map(i => i.toLowerCase());
        const allergens = (pizza.allergens || []).map(a => a.toLowerCase());

        return !excluded.some(ex => {
          if (allergens.includes(ex)) return true;
          if (ex === 'dairy' && ingredients.some(i => i.includes('cheese') || i.includes('mozzarella') || i.includes('parmigiano') || i.includes('ricotta') || i.includes('gorgonzola'))) {
            return true;
          }
          if (ex === 'nuts' && ingredients.some(i => i.includes('nut') || i.includes('pistachio') || i.includes('almond') || i.includes('pine nut'))) {
            return true;
          }
          if (ex === 'gluten' && !pizza.crust?.toLowerCase().includes('gluten-free')) {
            return true;
          }
          return false;
        });
      });
    }

    res.json({
      total: filtered.length,
      pizzas: filtered,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to filter by dietary criteria', details: err.message });
  }
});

router.get('/api/menu/:id/allergens', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid pizza ID' });
    }

    const pizza = await menuCol.findOne({ _id: new ObjectId(id) });
    if (!pizza) {
      return res.status(404).json({ error: 'Pizza not found' });
    }

    const ingredients = (pizza.ingredients || []).map(i => i.toLowerCase());
    const detectedAllergens = [];

    if (ingredients.some(i => i.includes('flour') || i.includes('wheat') || i.includes('crust')) && !pizza.crust?.toLowerCase().includes('gluten-free')) {
      detectedAllergens.push({ name: 'Gluten / Wheat', severity: 'High', source: 'Stone-Milled Organic Wheat Crust' });
    }
    if (ingredients.some(i => i.includes('mozzarella') || i.includes('cheese') || i.includes('parmigiano') || i.includes('ricotta') || i.includes('cream'))) {
      detectedAllergens.push({ name: 'Dairy / Lactose', severity: 'High', source: 'Fresh Italian Mozzarella Fior di Latte' });
    }
    if (ingredients.some(i => i.includes('pistachio') || i.includes('pine nut') || i.includes('walnut') || i.includes('nut'))) {
      detectedAllergens.push({ name: 'Tree Nuts', severity: 'Severe', source: 'Artisanal Pesto or Garnish Nuts' });
    }

    res.json({
      pizzaId: pizza._id.toString(),
      title: pizza.title,
      crust: pizza.crust,
      hydration: pizza.hydration || '75%',
      allergens: detectedAllergens,
      kitchenSafetyNote: 'Prepared in a hearth environment handling organic wheat flour and tree nuts.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve allergen details', details: err.message });
  }
});

export default router;
