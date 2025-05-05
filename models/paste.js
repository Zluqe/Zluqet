// =====================================
// Paste Model
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const Paste = sequelize.define('Paste', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  key: {
    type: DataTypes.STRING(8),
    unique: true,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.Sequelize.NOW
  }
}, {
  tableName: 'pastes',
  timestamps: false
});

sequelize.sync();

module.exports = Paste;