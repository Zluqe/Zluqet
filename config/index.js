// =====================================
// Config file for Zluqe
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const path = require('path');

module.exports = {
  PORT: process.env.PORT || 5000, // Only edit if you exposed the port in the dockerfile or hosting w/o docker.
  DB_TYPE: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'mysql' or 'postgres'
  DB_STORAGE: path.join(__dirname, '../instance/pastes.db'),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_NAME || 'zluqet',
  DB_USER: process.env.DB_USER || 'user',
  DB_PASS: process.env.DB_PASS || 'password',
  REQUESTS_PER_MINUTE: 5,
  CACHE_MAX: 1000,
  MAX_LENGTH: 25000
};