const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BudgetLog = sequelize.define('BudgetLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  previousTotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  newTotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = BudgetLog;
