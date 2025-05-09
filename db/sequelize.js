// =====================================
// Database connection
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const { Sequelize } = require('sequelize');
const sqlite3 = require('sqlite3');
const config = require('../config');

const {
  DB_TYPE,
  DB_STORAGE,
  DB_NAME,
  DB_USER,
  DB_PASS,
  DB_HOST,
  DB_PORT,
  DB_POOL_MAX    = 10,
  DB_POOL_MIN    = 0,
  DB_POOL_ACQUIRE= 30000,
  DB_POOL_IDLE   = 10000
} = config;

const pool = {
  max:     Number(DB_POOL_MAX),
  min:     Number(DB_POOL_MIN),
  acquire: Number(DB_POOL_ACQUIRE),
  idle:    Number(DB_POOL_IDLE)
};

const commonOptions = {
  dialect: DB_TYPE,
  logging: false,
  pool,
  define: {
    underscored:     true,
    freezeTableName: true,
    timestamps:      false
  }
};

const dialectExtras = {
  mysql:   { supportBigNumbers: true, bigNumberStrings: true },
  mariadb: { supportBigNumbers: true, bigNumberStrings: true },
  postgres:{ statement_timeout: 60000 },
  mssql:   {
    options: {
      encrypt: true,
      enableArithAbort: true,
      requestTimeout: 60000
    }
  }
};

let sequelize;
if (DB_TYPE === 'sqlite') {
  sequelize = new Sequelize({
    ...commonOptions,
    storage:       DB_STORAGE,
    dialectOptions:{
      mode:
        sqlite3.OPEN_READWRITE |
        sqlite3.OPEN_CREATE    |
        sqlite3.OPEN_FULLMUTEX
    }
  });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    ...commonOptions,
    host:           DB_HOST,
    port:           DB_PORT,
    dialectOptions: dialectExtras[DB_TYPE] || {}
  });
}

(async () => {
  try {
    await sequelize.authenticate();
    if (DB_TYPE === 'sqlite') {
      await Promise.all([
        sequelize.query('PRAGMA synchronous = OFF'),
        sequelize.query('PRAGMA journal_mode = WAL'),
        sequelize.query('PRAGMA cache_size = -10000')
      ]);
    }
    console.log(`[DB] Connected to ${DB_TYPE}`);
  } catch (err) {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  }
})();

module.exports = sequelize;