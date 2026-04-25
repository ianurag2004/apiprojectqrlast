/**
 * FestOS Demo User Seeder
 * Creates 5 demo accounts covering all roles.
 * Run: node scripts/seedDemoUsers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const bcrypt = require('bcryptjs');

const DEMO_USERS = [
  {
    name: 'Demo Organizer',
    email: 'organizer@demo.festos',
    password: 'demo1234',
    role: 'organizer',
    department: 'Computer Science',
    phone: '9876543210',
  },
  {
    name: 'Demo HOD',
    email: 'hod@demo.festos',
    password: 'demo1234',
    role: 'hod',
    department: 'Computer Science',
    phone: '9876543211',
  },
  {
    name: 'Demo Dean',
    email: 'dean@demo.festos',
    password: 'demo1234',
    role: 'dean',
    department: 'Administration',
    phone: '9876543212',
  },
  {
    name: 'Demo Student',
    email: 'student@demo.festos',
    password: 'demo1234',
    role: 'participant',
    department: 'Computer Science',
    phone: '9876543213',
  },
  {
    name: 'Demo Admin',
    email: 'admin@demo.festos',
    password: 'demo1234',
    role: 'super_admin',
    department: 'Administration',
    phone: '9876543214',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'festos', family: 4 });
  console.log('✅ Connected to MongoDB');

  // Dynamically load the User model
  const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    department: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    avatar: String,
    createdAt: { type: Date, default: Date.now },
  });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  for (const u of DEMO_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`⏭  Already exists: ${u.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`✅ Created: ${u.email} (${u.role})`);
  }

  console.log('\n🎉 Demo users seeded! Credentials:');
  DEMO_USERS.forEach(u => console.log(`   ${u.role.padEnd(12)} ${u.email}  /  ${u.password}`));
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
