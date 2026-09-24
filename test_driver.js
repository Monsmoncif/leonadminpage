require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false }));
  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const c = await Contract.findOne({ status: 'Completed', driverId: { $exists: true } });
  console.log('Contract:', c);
  if (c) {
    const user = await User.findById(c.driverId);
    console.log('User:', user);
    
    if (user) {
      const driver = await Driver.findOne({ email: user.email });
      console.log('Driver matching user email:', driver);
    }
  }
  process.exit(0);
}

test();
