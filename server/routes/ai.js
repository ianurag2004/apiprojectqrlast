const express = require('express');
const router = express.Router();
const { predictTurnout, optimizeBudget, balanceVolunteers, scoreEngagement, healthCheck } = require('../services/aiService');
const { protect } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');
const OpenAI = require('openai');

// ── FestBot Chat (OpenAI GPT-4o) ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are FestBot, an intelligent AI assistant for FestOS — the Event Lifecycle Management System of Manav Rachna University, India.

You help students, organizers, HODs, and Deans with:
- Event planning, timelines, and logistics
- Budget estimation and optimization (costs in Indian Rupees ₹)
- Volunteer management and workload balancing
- Participant registration and QR check-in workflows
- Multi-level approval processes (Organizer → HOD → Dean)
- Turnout predictions and engagement scoring
- University event best practices

Personality: Professional yet friendly. Concise but complete. Use emojis sparingly for clarity.
Always format lists with bullet points. Keep responses under 200 words unless a detailed answer is needed.
When asked about numbers, use Indian number formatting (lakhs, thousands).
If unsure, say so clearly rather than guessing.`;

let openaiClient = null;

function getOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

router.post('/chat', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const openai = getOpenAI();
    if (!openai) {
      return res.json({
        success: true,
        reply: "I'm FestBot! 🤖 My AI brain isn't connected yet. Ask your admin to add an OpenAI API key to get full AI responses. In the meantime, explore FestOS — create events, manage budgets, and track registrations!",
        fallback: true,
      });
    }

    // Build OpenAI messages array: system prompt + history + current message
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      // Convert chat history: 'model' role → 'assistant' for OpenAI
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.text,
      })),
      { role: 'user', content: message.trim() },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages,
    });

    const reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    res.json({ success: true, reply });

  } catch (err) {
    console.error('OpenAI chat error:', err.message);
    res.json({
      success: true,
      reply: "Sorry, I ran into a hiccup! 😅 Please try again in a moment.",
      error: true,
    });
  }
});

// ── Analytics AI routes (formula-based with Claude fallback in aiService) ────

router.post('/predict/turnout', protect, async (req, res, next) => {
  try {
    const key = `ai:turnout:${JSON.stringify(req.body)}`;
    const cached = await cacheGet(key);
    if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });
    const result = await predictTurnout(req.body);
    await cacheSet(key, JSON.stringify(result), 3600);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/optimize/budget', protect, async (req, res, next) => {
  try {
    const result = await optimizeBudget(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/balance/volunteers', protect, async (req, res, next) => {
  try {
    const result = await balanceVolunteers(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/score/engagement', protect, async (req, res, next) => {
  try {
    const result = await scoreEngagement(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.json({ success: true, data: health });
});

module.exports = router;
