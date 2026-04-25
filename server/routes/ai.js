const express = require('express');
const router = express.Router();
const { predictTurnout, optimizeBudget, balanceVolunteers, scoreEngagement, healthCheck } = require('../services/aiProxy');
const { protect } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── AI Chat ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are FestBot, an intelligent AI assistant for FestOS — the Event Lifecycle Management System of Manav Rachna University, India.

You help students, organizers, HODs, Deans, and finance staff with:
- Event planning, timelines, and logistics
- Budget estimation and optimization (costs in Indian Rupees ₹)
- Volunteer management and workload balancing
- Participant registration and check-in workflows
- Multi-level approval processes (Organizer → HOD → Dean → Finance)
- AI-powered turnout predictions and engagement scoring
- University event best practices

Personality: Professional yet friendly. Concise but complete. Use emojis sparingly for clarity.
Always format lists with bullet points. Keep responses under 200 words unless a detailed answer is needed.
When asked about numbers, use Indian number formatting (lakhs, thousands).
If unsure, say so clearly rather than guessing.`;

let genAI = null;
function getGemini() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  console.log(genAI);
  return genAI;
}

router.post('/chat', protect, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const ai = getGemini();
    if (!ai) {
      // Graceful fallback when no API key
      return res.json({
        success: true,
        reply: "I'm FestBot! 🤖 It looks like my AI brain isn't connected yet. Ask your admin to add a Gemini API key to get full AI responses. In the meantime, feel free to explore FestOS — create events, manage budgets, and track registrations!",
        fallback: true,
      });
    }

    // systemInstruction must be set at the model level (SDK v0.24+)
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build history for multi-turn chat
    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
    });

    console.log(message);

    const result = await chat.sendMessage(message.trim());
    console.log(result);
    const reply = result.response.text();

    res.json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err.message, err.stack);
    res.json({
      success: true,
      reply: "Sorry, I ran into a hiccup! 😅 Please try again in a moment.",
      error: true,
    });
  }
});

// ── Existing AI routes ───────────────────────────────────────────────────────

// Proxy all AI calls through Node (handles Redis caching + auth)
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

