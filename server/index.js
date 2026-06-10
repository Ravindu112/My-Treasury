require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const syncDatabase = require('./config/sync');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api', require('./routes/tasks'));
app.use('/api', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));

app.get('/', (req, res) => {
  res.json({ message: 'My Treasure API is running.' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected.');
    return syncDatabase();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Startup error:', err);
  });
