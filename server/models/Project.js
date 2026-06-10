const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  totalBudget: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  remainingBudget: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed'),
    defaultValue: 'active',
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Project;
