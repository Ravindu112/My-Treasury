const sequelize = require('./database');

const syncDatabase = async () => {
  try {
    await sequelize.sync();
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Database sync failed:', error);
  }
};

const alterDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database altered successfully.');
  } catch (error) {
    console.error('Database alter failed:', error);
  }
};

module.exports = syncDatabase;
module.exports.alter = alterDatabase;
module.exports.sync = syncDatabase;

module.exports = syncDatabase;
