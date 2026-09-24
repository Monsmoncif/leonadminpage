const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/');
  
  const inspections = mongoose.connection.collection('inspections');
  const docs = await inspections.find({}).sort({_id: -1}).limit(5).toArray();
  console.log(JSON.stringify(docs, null, 2));
  
  await mongoose.disconnect();
}
run().catch(console.error);
