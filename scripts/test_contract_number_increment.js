const mongoose = require('mongoose');

async function testIncrement() {
  const uri = 'mongodb+srv://mons:mons@cluster0.8dgvlvp.mongodb.net/';
  await mongoose.connect(uri);
  const contractsCol = mongoose.connection.db.collection('contracts');

  const lastContract = await contractsCol
    .findOne({ contractNumber: { $exists: true, $ne: null } }, { sort: { contractNumber: -1 } });

  console.log('Current highest contract in DB:', lastContract ? lastContract.contractNumber : 'none');

  const nextNumber =
    lastContract && typeof lastContract.contractNumber === 'number' && lastContract.contractNumber >= 2000
      ? lastContract.contractNumber + 1
      : 2000;

  console.log('Next contract will be assigned number:', nextNumber);

  await mongoose.disconnect();
}

testIncrement().catch(console.error);
