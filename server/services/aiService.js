/**
 * FestOS AI Service — powered by Anthropic Claude API
 * Provides analytics predictions with formula-based fallbacks.
 *
 * Exports the same 4 functions as the old aiProxy.js:
 *   predictTurnout(payload)
 *   optimizeBudget(payload)
 *   balanceVolunteers(payload)
 *   scoreEngagement(payload)
 *
 * All functions have formula-based fallbacks if the API key is missing
 * or the Gemini call fails, so the app always works.
 */

const Anthropic = require('@anthropic-ai/sdk');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const MODEL_NAME    = 'claude-opus-4-5';

let anthropic = null;

function getClient() {
  if (anthropic) return anthropic;
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your_claude_api_key_here') return null;
  anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY });
  return anthropic;
}

/** Call Claude with a prompt, parse JSON response. Returns null on failure. */
async function callClaude(prompt) {
  const client = getClient();
  if (!client) return null;
  try {
    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 512,
      system: 'You are a JSON-only analytics API. Return ONLY valid JSON with no markdown, no explanation, no code fences.',
      messages: [{ role: 'user', content: prompt }],
    });
    const text  = response.content[0]?.text?.trim() || '';
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn('⚠️  Claude API error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. TURNOUT PREDICTION
// ---------------------------------------------------------------------------

const TYPE_BASE = {
  cultural: 420, technical: 310, workshop: 180, sports: 510, seminar: 150,
};
const SEASONAL_MONTHS = [2, 3, 10, 11, 12];

function _fallbackTurnout({ event_type, date, venue_capacity = 500, registration_days = 14 }) {
  const dt            = date ? new Date(date) : new Date();
  const month         = dt.getMonth() + 1;
  const dow           = dt.getDay(); // 0=Sun
  const base          = TYPE_BASE[event_type] || 300;
  const seasonal      = SEASONAL_MONTHS.includes(month) ? 1.2 : 0.85;
  const dayFactor     = [0, 6].includes(dow) ? 1.15 : 1.0;
  const regFactor     = 1 + Math.min(registration_days, 30) * 0.005;
  const predicted     = Math.min(Math.round(base * seasonal * dayFactor * regFactor), venue_capacity);

  return {
    predicted,
    confidence: 0.72,
    factors: {
      base_rate:      base,
      seasonal_factor: seasonal,
      day_factor:     dayFactor,
      is_peak_season: SEASONAL_MONTHS.includes(month),
      is_weekend:     [0, 6].includes(dow),
    },
  };
}

async function predictTurnout(payload) {
  const { event_type = 'technical', date, venue_capacity = 500, registration_days = 14 } = payload;

  const prompt = `
You are an event analytics AI for Manav Rachna University, India.
Predict attendance for this event:
- event_type: ${event_type}
- date: ${date || 'unknown'}
- venue_capacity: ${venue_capacity}
- registration_days: ${registration_days}

Context: University events in India peak in Oct-Mar (cultural fests, tech fests). Weekends see 15% more walk-ins.
Cost-per-head benchmarks: cultural=420, technical=310, workshop=180, sports=510, seminar=150.

Return ONLY valid JSON (no markdown):
{
  "predicted": <integer, capped at venue_capacity>,
  "confidence": <float 0.60-0.97>,
  "factors": {
    "base_rate": <integer>,
    "seasonal_factor": <float>,
    "day_factor": <float>,
    "is_peak_season": <boolean>,
    "is_weekend": <boolean>
  }
}`.trim();

  const ai = await callClaude(prompt);
  if (ai && typeof ai.predicted === 'number') {
    ai.predicted   = Math.min(Math.round(ai.predicted), venue_capacity);
    ai.confidence  = Math.max(0.60, Math.min(0.97, ai.confidence || 0.72));
    return ai;
  }
  return _fallbackTurnout(payload);
}

// ---------------------------------------------------------------------------
// 2. BUDGET OPTIMIZATION
// ---------------------------------------------------------------------------

const COST_PER_HEAD = {
  cultural: 180, technical: 160, workshop: 120, sports: 140, seminar: 100,
};

function _fallbackBudget({ event_type, predicted_turnout = 200, total_budget, sponsorship = 0 }) {
  const cph              = COST_PER_HEAD[event_type] || 150;
  const recommendedTotal = predicted_turnout * cph;
  const effective        = total_budget || recommendedTotal;
  const net              = Math.max(effective - sponsorship, 0);
  const allocation = {
    venue:       Math.round(net * 0.30),
    catering:    Math.round(net * 0.25),
    logistics:   Math.round(net * 0.20),
    marketing:   Math.round(net * 0.15),
    contingency: Math.round(net * 0.10),
  };
  return {
    recommended_total: recommendedTotal,
    effective_budget:  effective,
    net_after_sponsorship: net,
    cost_per_head:     cph,
    allocation,
    surplus_deficit:   effective - recommendedTotal,
    utilization_rate:  Math.min(+(effective / Math.max(recommendedTotal, 1)).toFixed(2), 2.0),
    tips: [`For ${event_type} events, prioritise venue and logistics costs.`],
    insights: [],
  };
}

async function optimizeBudget(payload) {
  const {
    event_type = 'technical',
    predicted_turnout = 200,
    total_budget,
    sponsorship = 0,
  } = payload;

  const prompt = `
You are a university event budget advisor for Manav Rachna University, India.
Optimize the budget for this event:
- event_type: ${event_type}
- predicted_turnout: ${predicted_turnout}
- total_budget (INR): ${total_budget || 'not specified'}
- confirmed_sponsorship (INR): ${sponsorship}

Indian university reference costs (INR):
  cultural: ₹180/head, technical: ₹160/head, workshop: ₹120/head, sports: ₹140/head, seminar: ₹100/head.
Standard split: venue 30%, catering 25%, logistics 20%, marketing 15%, contingency 10%.
Adjust split percentages for the event type (e.g., sports needs more logistics).

Return ONLY valid JSON (no markdown):
{
  "recommended_total": <integer INR>,
  "effective_budget": <integer INR — use total_budget if provided, else recommended_total>,
  "net_after_sponsorship": <integer INR>,
  "cost_per_head": <integer INR>,
  "allocation": {
    "venue": <int>, "catering": <int>, "logistics": <int>,
    "marketing": <int>, "contingency": <int>
  },
  "surplus_deficit": <int, positive=surplus, negative=deficit>,
  "utilization_rate": <float>,
  "tips": [<up to 3 actionable tip strings>],
  "insights": [<up to 2 insight strings>]
}`.trim();

  const ai = await callClaude(prompt);
  if (ai && typeof ai.recommended_total === 'number') return ai;
  return _fallbackBudget(payload);
}

// ---------------------------------------------------------------------------
// 3. VOLUNTEER BALANCING
// ---------------------------------------------------------------------------

const ROLE_EXPECTED = {
  coordinator: 8, logistics: 6, registration: 5,
  security: 4, tech: 7, marketing: 5, hospitality: 4,
};

function _fallbackVolunteers(volunteers) {
  if (!volunteers || volunteers.length === 0) {
    return { imbalanced: [], overloaded: [], underloaded: [], suggestions: [], scores: [], summary: {} };
  }
  const scores = volunteers.map(v => {
    const expected  = ROLE_EXPECTED[v.role] || 6;
    const deviation = ((v.tasks_assigned || 0) - expected) / Math.max(expected, 1);
    return { ...v, workload_score: Math.max(0, Math.min(100, Math.round(50 + deviation * 50))) };
  });
  const mean   = scores.reduce((s, v) => s + v.workload_score, 0) / scores.length;
  const overloaded   = scores.filter(v => v.workload_score > 70).map(v => v.id);
  const underloaded  = scores.filter(v => v.workload_score < 30).map(v => v.id);
  const suggestions  = overloaded.map(oid => {
    const o = scores.find(v => v.id === oid);
    const u = scores.find(v => underloaded.includes(v.id));
    if (!o || !u) return null;
    return { from_id: o.id, from_name: o.name, to_id: u.id, to_name: u.name,
             task: `Reassign 1 task from ${o.role} duties`, impact: 'Reduces overload by ~1 task unit' };
  }).filter(Boolean);
  return {
    imbalanced: [...overloaded, ...underloaded],
    overloaded, underloaded, suggestions,
    scores: scores.map(v => ({ id: v.id, name: v.name, workload_score: v.workload_score, status: v.workload_score > 70 ? 'overloaded' : v.workload_score < 30 ? 'underloaded' : 'balanced' })),
    summary: { mean_workload: +mean.toFixed(1), balance_grade: overloaded.length === 0 ? 'Good' : 'Needs Attention' },
  };
}

async function balanceVolunteers(payload) {
  const volunteers = payload.volunteers || payload || [];
  if (!Array.isArray(volunteers) || volunteers.length === 0) return _fallbackVolunteers([]);

  const prompt = `
You are a volunteer workload balancer for a university event management system.
Analyse these volunteers and recommend redistribution:
${JSON.stringify(volunteers, null, 2)}

Role expected task counts: ${JSON.stringify(ROLE_EXPECTED)}
Workload score: 0=underloaded, 50=balanced, 100=overloaded.
Overloaded = score>70, Underloaded = score<30.

Return ONLY valid JSON (no markdown):
{
  "imbalanced": [<volunteer id strings>],
  "overloaded": [<volunteer id strings>],
  "underloaded": [<volunteer id strings>],
  "suggestions": [
    { "from_id": <str>, "from_name": <str>, "to_id": <str>, "to_name": <str>, "task": <str>, "impact": <str> }
  ],
  "scores": [
    { "id": <str>, "name": <str>, "workload_score": <0-100 int>, "status": "overloaded"|"balanced"|"underloaded" }
  ],
  "summary": {
    "mean_workload": <float>,
    "max_workload": <float>,
    "min_workload": <float>,
    "balance_grade": "Good"|"Needs Attention"
  }
}`.trim();

  const ai = await callClaude(prompt);
  if (ai && Array.isArray(ai.scores)) return ai;
  return _fallbackVolunteers(volunteers);
}

// ---------------------------------------------------------------------------
// 4. ENGAGEMENT SCORING
// ---------------------------------------------------------------------------

function _gradeScore(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function _fallbackEngagement({ attendance_rate = 0.7, budget_utilization = 0.9, feedback_avg = 4.0, social_reach = 500, actual_attendance = 200 }) {
  const social_norm = social_reach / (actual_attendance + 1);
  const score = +(
    attendance_rate * 40 +
    Math.min(budget_utilization, 1.0) * 20 +
    (feedback_avg / 5.0) * 30 +
    Math.min(social_norm / 3, 1.0) * 10
  ).toFixed(1);
  const insights = [];
  if (attendance_rate < 0.6) insights.push('Low attendance rate — consider better pre-event marketing.');
  else if (attendance_rate > 0.9) insights.push('Excellent turnout! Venue was nearly at full capacity.');
  if (budget_utilization > 1.05) insights.push('Event went over budget — review cost controls for next time.');
  if (feedback_avg < 3.5) insights.push('Low feedback scores — conduct detailed post-event survey.');
  else if (feedback_avg > 4.5) insights.push('Outstanding participant feedback — document best practices.');
  if (score >= 80) insights.push('High engagement — this event format should be replicated.');
  return {
    engagement_score: Math.max(0, Math.min(score, 100)),
    grade: _gradeScore(score),
    breakdown: {
      attendance_component: +(attendance_rate * 40).toFixed(1),
      budget_component:     +(Math.min(budget_utilization, 1.0) * 20).toFixed(1),
      feedback_component:   +((feedback_avg / 5.0) * 30).toFixed(1),
      social_component:     +(Math.min(social_norm / 3, 1.0) * 10).toFixed(1),
    },
    insights,
  };
}

async function scoreEngagement(payload) {
  const {
    attendance_rate = 0.7,
    budget_utilization = 0.9,
    feedback_avg = 4.0,
    social_reach = 500,
    actual_attendance = 200,
  } = payload;

  const social_norm = +(social_reach / (actual_attendance + 1)).toFixed(2);

  const prompt = `
You are an event engagement analyst for Manav Rachna University.
Score this post-event report and generate insights:
- attendance_rate: ${attendance_rate} (actual/capacity, 0-1)
- budget_utilization: ${budget_utilization} (actual_spend/approved, 0-2)
- feedback_avg: ${feedback_avg} (1-5 scale)
- social_reach: ${social_reach} (social media impressions)
- actual_attendance: ${actual_attendance}
- social_norm (reach/attendance): ${social_norm}

Scoring weights: attendance 40pts, budget_efficiency 20pts, feedback 30pts, social 10pts.
Generate 2-4 specific, actionable insights in plain English.

Return ONLY valid JSON (no markdown):
{
  "engagement_score": <float 0-100>,
  "grade": "A+"|"A"|"B+"|"B"|"C"|"D",
  "breakdown": {
    "attendance_component": <float>,
    "budget_component": <float>,
    "feedback_component": <float>,
    "social_component": <float>
  },
  "insights": [<2-4 insight strings, specific and actionable>]
}`.trim();

  const ai = await callClaude(prompt);
  if (ai && typeof ai.engagement_score === 'number') {
    ai.engagement_score = Math.max(0, Math.min(100, ai.engagement_score));
    ai.grade = _gradeScore(ai.engagement_score);
    return ai;
  }
  return _fallbackEngagement(payload);
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 5. HEALTH CHECK
// ---------------------------------------------------------------------------

async function healthCheck() {
  const hasKey = !!(CLAUDE_API_KEY && CLAUDE_API_KEY !== 'your_claude_api_key_here');
  return {
    status: 'ok',
    service: 'FestOS AI Engine (Claude API)',
    version: '3.0.0',
    provider: 'Anthropic Claude',
    model: MODEL_NAME,
    api_key_configured: hasKey,
    fallback_mode: !hasKey,
  };
}

// ---------------------------------------------------------------------------

module.exports = { predictTurnout, optimizeBudget, balanceVolunteers, scoreEngagement, healthCheck };
