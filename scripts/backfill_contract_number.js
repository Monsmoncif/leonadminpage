const mongoose = require('mongoose');

async function main() {
  const uri = 'mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const contractsCol = mongoose.connection.db.collection('contracts');
  const existingContracts = await contractsCol.find().sort({ createdAt: 1 }).toArray();

  let startNumber = 2000;
  for (const c of existingContracts) {
    if (!c.contractNumber) {
      await contractsCol.updateOne(
        { _id: c._id },
        { $set: { contractNumber: startNumber } }
      );
      console.log(`Updated contract ${c._id} to contractNumber ${startNumber}`);
      startNumber++;
    } else {
      console.log(`Contract ${c._id} already has contractNumber ${c.contractNumber}`);
      if (c.contractNumber >= startNumber) {
        startNumber = c.contractNumber + 1;
      }
    }
  }

  const all = await contractsCol.find().toArray();
  all.forEach(c => console.log(`Verified contract ${c._id} -> contractNumber: ${c.contractNumber}`));
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
