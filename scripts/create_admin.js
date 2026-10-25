const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || 'mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/leon_rental';

async function main() {
  console.log('Connecting to:', uri.replace(/:[^:]*@/, ':****@'));
  await mongoose.connect(uri);
  console.log('Connected to MongoDB successfully.');

  const users = mongoose.connection.collection('users');
  const existing = await users.findOne({ email: 'admin@gmail.com' });

  const hashedPassword = await bcrypt.hash('admin123', 10);

  if (existing) {
    console.log('Existing user found with email:', existing.email, 'Current role:', existing.role);
    await users.updateOne(
      { _id: existing._id },
      { 
        $set: { 
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          updatedAt: new Date()
        } 
      }
    );
    console.log('Admin user updated successfully with password: admin123');
  } else {
    const res = await users.insertOne({
      name: 'Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Admin user created successfully with ID:', res.insertedId);
  }

  const verified = await users.findOne({ email: 'admin@gmail.com' });
  console.log('Verification:');
  console.log({
    _id: verified._id,
    name: verified.name,
    email: verified.email,
    role: verified.role,
    status: verified.status,
    passwordMatches: await bcrypt.compare('admin123', verified.password)
  });

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error creating admin:', err);
  process.exit(1);
});
