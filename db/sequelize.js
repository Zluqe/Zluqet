// =====================================
// Database connection
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const Sequelize = require('sequelize');
const config = require('../config');

let sequelize;

if (config.DB_TYPE === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: config.DB_STORAGE,
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  });
} else {
  sequelize = new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASS, {
    host: config.DB_HOST,
    port: config.DB_PORT,
    dialect: config.DB_TYPE,
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  });
}

// SQLite tuning
(async () => {
  try {
    await sequelize.authenticate();

    if (config.DB_TYPE === 'sqlite') {
      await sequelize.query('PRAGMA synchronous = OFF');
      await sequelize.query('PRAGMA journal_mode = WAL');
      await sequelize.query('PRAGMA cache_size = 10000');
    }

    console.log(`[DB] Connected to ${config.DB_TYPE}`);
  } catch (err) {
    console.error(`[DB] Connection error:`, err);
  }
})();

module.exports = sequelize;