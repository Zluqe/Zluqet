// =====================================
// Rate Limiter
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const { REQUESTS_PER_MINUTE } = require('../config');

const EXEMPT_IPS = new Set();
const ipRequests = new Map();

module.exports = (req, res, next) => {
  if (!req.path.startsWith('/api/')) return next();

  const ip = req.ip;
  if (!EXEMPT_IPS.has(ip)) {
    const now = Date.now() / 1000;
    if (!ipRequests.has(ip)) ipRequests.set(ip, []);
    const timestamps = ipRequests.get(ip);

    while (timestamps.length && now - timestamps[0] > 60) {
      timestamps.shift();
    }

    if (timestamps.length >= REQUESTS_PER_MINUTE) {
      return res.status(429).json({ error: 'Too many requests, please slow down.' });
    }

    timestamps.push(now);
  }

  next();
};
