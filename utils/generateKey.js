// =====================================
// Generate a random key for pastes
// Created by Person0z
// Copyright (c) 2025 Zluqe
// ====================================

const Paste = require('../models/paste');

module.exports = async function generateKey(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key, exists;
  do {
    key = Array.from({ length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    exists = await Paste.findOne({ where: { key } });
  } while (exists);
  return key;
};