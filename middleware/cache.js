// =====================================
// Cache for pastes
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const { LRUCache } = require('lru-cache');
const Paste = require('../models/paste');
const { CACHE_MAX } = require('../config');

const pasteCache = new LRUCache({ max: CACHE_MAX });

function cachePaste(p) {
  return { content: p.content, key: p.key, created_at: p.created_at };
}

async function getPasteByKey(key) {
  if (pasteCache.has(key)) {
    return pasteCache.get(key);
  }
  const p = await Paste.findOne({ where: { key } });
  if (!p) return null;
  const lite = cachePaste(p);
  pasteCache.set(key, lite);
  return lite;
}

module.exports = { getPasteByKey, cachePaste, pasteCache };
