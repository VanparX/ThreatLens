require('module-alias/register');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

// ✅ ADD THIS (your new route)
const threatRoutes = require('@/routes/appRoutes/threatRoutes');

// Make sure we are running node 20+
const [major] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  console.log('Please upgrade your node.js version at least 20 or greater. 👌\n ');
  process.exit();
}

// ENV
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// MongoDB
mongoose.connect(process.env.DATABASE);

mongoose.connection.on('error', (error) => {
  console.log(
    `1. 🔥 Common Error caused issue → : check your .env file first and add your mongodb url`
  );
  console.error(`2. 🚫 Error → : ${error.message}`);
});

// Load models
const modelsFiles = globSync('./src/models/**/*.js');
for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

// App
const app = require('./app');

// ✅ REGISTER ROUTE HERE
app.use('/api', threatRoutes);

// Start server
app.set('port', process.env.PORT || 8888);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → On PORT : ${server.address().port}`);
});