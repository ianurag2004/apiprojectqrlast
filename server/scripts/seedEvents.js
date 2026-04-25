/**
 * FestOS Sample Events Seeder
 * Seeds 8 realistic events across all types and statuses.
 * Run: node scripts/seedEvents.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'festos', family: 4 });
  console.log('✅ Connected to MongoDB');

  // Minimal inline schemas (avoid import issues with real models)
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String, email: String, role: String, department: String,
  }));

  const ApprovalStep = new mongoose.Schema({
    role: String, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, default: 'pending' }, comment: { type: String, default: '' }, timestamp: { type: Date, default: null },
  });

  const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({
    title: String, type: String, description: String,
    date: Date, endDate: Date, venue: String,
    venueCapacity: Number, expectedAttendance: Number,
    tags: [String], status: String,
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalChain: { type: [ApprovalStep], default: () => [
      { role: 'hod', status: 'pending' }, { role: 'dean', status: 'pending' }, { role: 'finance', status: 'pending' },
    ]},
    registrationDeadline: Date, registrationOpen: { type: Boolean, default: false },
    aiPredictedTurnout: Number, aiConfidence: Number,
    bannerImage: String,
  }, { timestamps: true }));

  const organizer = await User.findOne({ email: 'organizer@demo.festos' });
  const hod       = await User.findOne({ email: 'hod@demo.festos' });
  const dean      = await User.findOne({ email: 'dean@demo.festos' });
  const finance   = await User.findOne({ email: 'finance@demo.festos' });

  if (!organizer) { console.error('❌ Run seedDemoUsers.js first'); process.exit(1); }

  const now  = new Date();
  const d    = (offsetDays) => new Date(now.getTime() + offsetDays * 86400000);

  const events = [
    {
      title: 'TechFusion 2025 — National Hackathon',
      type: 'technical',
      description: 'A 36-hour national-level hackathon where students compete to build innovative solutions for real-world problems across tracks: FinTech, HealthTech, EdTech and Smart Cities.',
      date: d(18), endDate: d(19),
      venue: 'Manav Rachna Innovation & Incubation Centre',
      venueCapacity: 600, expectedAttendance: 480,
      tags: ['hackathon', 'coding', 'innovation', 'national'],
      status: 'approved',
      organizer: organizer._id,
      registrationDeadline: d(10), registrationOpen: true,
      aiPredictedTurnout: 462, aiConfidence: 0.87,
      approvalChain: [
        { role: 'hod',     status: 'approved', user: hod?._id,     comment: 'Excellent initiative!',    timestamp: d(-5) },
        { role: 'dean',    status: 'approved', user: dean?._id,    comment: 'Approved. Go ahead.',       timestamp: d(-3) },
        { role: 'finance', status: 'approved', user: finance?._id, comment: 'Budget sanctioned.',        timestamp: d(-1) },
      ],
    },
    {
      title: 'Rhythm Fest — Annual Cultural Night',
      type: 'cultural',
      description: 'A grand cultural extravaganza featuring performances in classical dance, fusion music, street plays, and fashion shows. Open to all MRU students and invited colleges.',
      date: d(25), endDate: d(25),
      venue: 'Open-Air Amphitheatre, MRU Campus',
      venueCapacity: 2000, expectedAttendance: 1800,
      tags: ['dance', 'music', 'theatre', 'fashion', 'fest'],
      status: 'approved',
      organizer: organizer._id,
      registrationDeadline: d(20), registrationOpen: true,
      aiPredictedTurnout: 1720, aiConfidence: 0.91,
      approvalChain: [
        { role: 'hod',     status: 'approved', user: hod?._id,     comment: 'Approved.', timestamp: d(-8) },
        { role: 'dean',    status: 'approved', user: dean?._id,    comment: 'Approved.', timestamp: d(-6) },
        { role: 'finance', status: 'approved', user: finance?._id, comment: 'Approved.', timestamp: d(-4) },
      ],
    },
    {
      title: 'AI & ML Bootcamp',
      type: 'workshop',
      description: 'An intensive 2-day workshop covering machine learning fundamentals, deep learning, and hands-on model building with Python, TensorFlow, and Hugging Face.',
      date: d(7), endDate: d(8),
      venue: 'CS Lab Complex, Block D',
      venueCapacity: 120, expectedAttendance: 100,
      tags: ['AI', 'machine-learning', 'python', 'workshop'],
      status: 'hod_approved',
      organizer: organizer._id,
      registrationDeadline: d(5), registrationOpen: false,
      aiPredictedTurnout: 98, aiConfidence: 0.82,
      approvalChain: [
        { role: 'hod',     status: 'approved', user: hod?._id, comment: 'Good initiative.', timestamp: d(-2) },
        { role: 'dean',    status: 'pending' },
        { role: 'finance', status: 'pending' },
      ],
    },
    {
      title: 'Inter-College Cricket Premier League',
      type: 'sports',
      description: 'A T20 cricket tournament with 16 teams from across Delhi-NCR. Knockout format with prize money for top 3 teams. Separate categories for men and women.',
      date: d(30), endDate: d(37),
      venue: 'MRU Cricket Ground & Sports Complex',
      venueCapacity: 1500, expectedAttendance: 1200,
      tags: ['cricket', 'sports', 'tournament', 'inter-college'],
      status: 'pending',
      organizer: organizer._id,
      registrationDeadline: d(22), registrationOpen: false,
      aiPredictedTurnout: 1180, aiConfidence: 0.79,
    },
    {
      title: 'Entrepreneurship Summit 2025',
      type: 'seminar',
      description: 'A full-day summit featuring keynote addresses from successful startup founders, panel discussions on funding, and networking sessions between students and investors.',
      date: d(14), endDate: d(14),
      venue: 'Convention Hall, Administrative Block',
      venueCapacity: 400, expectedAttendance: 350,
      tags: ['startup', 'entrepreneurship', 'networking', 'seminar'],
      status: 'dean_approved',
      organizer: organizer._id,
      registrationDeadline: d(10), registrationOpen: false,
      aiPredictedTurnout: 332, aiConfidence: 0.84,
      approvalChain: [
        { role: 'hod',  status: 'approved', user: hod?._id,  comment: 'Highly relevant.',  timestamp: d(-4) },
        { role: 'dean', status: 'approved', user: dean?._id, comment: 'Great for campus.', timestamp: d(-2) },
        { role: 'finance', status: 'pending' },
      ],
    },
    {
      title: 'Design Thinking & UX Workshop',
      type: 'workshop',
      description: 'Learn the end-to-end design thinking process — empathise, define, ideate, prototype and test. Hands-on sessions with Figma and real product design challenges.',
      date: d(45),
      venue: 'Innovation Lab, Block E',
      venueCapacity: 80, expectedAttendance: 70,
      tags: ['design', 'UX', 'figma', 'product'],
      status: 'draft',
      organizer: organizer._id,
      registrationDeadline: d(40),
      aiPredictedTurnout: 68, aiConfidence: 0.78,
    },
    {
      title: 'Freshers Welcome Fiesta',
      type: 'cultural',
      description: 'A welcome event for 2025 batch freshers featuring introductions, cultural performances by seniors, fun games, and a grand dinner.',
      date: d(-15), endDate: d(-15),
      venue: 'Main Auditorium, MRU',
      venueCapacity: 1000, expectedAttendance: 900,
      tags: ['freshers', 'welcome', 'cultural', 'fun'],
      status: 'completed',
      organizer: organizer._id,
      registrationOpen: false,
      aiPredictedTurnout: 870, aiConfidence: 0.88,
      approvalChain: [
        { role: 'hod',     status: 'approved', user: hod?._id,     timestamp: d(-30) },
        { role: 'dean',    status: 'approved', user: dean?._id,    timestamp: d(-28) },
        { role: 'finance', status: 'approved', user: finance?._id, timestamp: d(-26) },
      ],
    },
    {
      title: 'Cybersecurity & Ethical Hacking Seminar',
      type: 'seminar',
      description: 'Expert-led seminar on cybersecurity threats, ethical hacking methodologies, CTF competition, and career opportunities in InfoSec.',
      date: d(55),
      venue: 'Seminar Hall 2, CS Department',
      venueCapacity: 250, expectedAttendance: 200,
      tags: ['cybersecurity', 'hacking', 'CTF', 'seminar'],
      status: 'draft',
      organizer: organizer._id,
      registrationDeadline: d(48),
    },
  ];

  let created = 0;
  for (const ev of events) {
    const exists = await Event.findOne({ title: ev.title });
    if (exists) { console.log(`⏭  Skipped: ${ev.title}`); continue; }
    await Event.create(ev);
    console.log(`✅ Created: [${ev.status.toUpperCase()}] ${ev.title}`);
    created++;
  }

  console.log(`\n🎉 Done! ${created} events seeded.`);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
