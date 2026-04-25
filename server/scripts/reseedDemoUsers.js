/**
 * FestOS Demo User Re-seeder
 * Deletes & recreates demo accounts using the real User model
 * (so bcrypt pre-save hook runs correctly with salt=12)
 * Run: node scripts/reseedDemoUsers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('../models/User');

const DEMO_EMAILS = [
  'organizer@demo.festos',
  'hod@demo.festos',
  'dean@demo.festos',
  'finance@demo.festos',   // will be deleted
  'student@demo.festos',
  'admin@demo.festos',
];

const DEMO_USERS = [
  { name: 'Demo Organizer', email: 'organizer@demo.festos', password: 'demo1234', role: 'organizer',   department: 'Computer Science', phone: '9876543210' },
  { name: 'Demo HOD',       email: 'hod@demo.festos',       password: 'demo1234', role: 'hod',         department: 'Computer Science', phone: '9876543211' },
  { name: 'Demo Dean',      email: 'dean@demo.festos',      password: 'demo1234', role: 'dean',        department: 'Administration',   phone: '9876543212' },
  { name: 'Demo Student',   email: 'student@demo.festos',   password: 'demo1234', role: 'participant', department: 'Computer Science', phone: '9876543213' },
  { name: 'Demo Admin',     email: 'admin@demo.festos',     password: 'demo1234', role: 'super_admin', department: 'Administration',   phone: '9876543214' },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'festos', family: 4 });
  console.log('✅ Connected to MongoDB');

  // Remove old demo users
  const deleted = await User.deleteMany({ email: { $in: DEMO_EMAILS } });
  console.log(`🗑  Removed ${deleted.deletedCount} old demo user(s)`);

  // Recreate using the real model (pre-save hook hashes password correctly)
  for (const u of DEMO_USERS) {
    await User.create(u);
    console.log(`✅ Created: ${u.email} (${u.role})`);
  }

  console.log('\n🎉 Demo users ready! Login with password: demo1234');
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
