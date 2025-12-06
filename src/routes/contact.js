import { Router } from 'express';
import ContactMessage from '../models/ContactMessage.js';
import auth from '../middleware/auth.js';

const router = Router();

// Create a contact message (authenticated)
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }
    const doc = await ContactMessage.create({
      userId: req.user.id,
      name,
      email,
      phone,
      message,
    });
    res.status(201).json({ id: doc._id });
  } catch (err) {
    console.error('Contact create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Optionally: list current user messages
router.get('/mine', auth, async (req, res) => {
  try {
    const items = await ContactMessage.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('Contact list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
