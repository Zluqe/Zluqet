// =====================================
// API for Zluqet
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const express = require('express');
const Paste = require('../models/paste');
const { getPasteByKey, cachePaste, pasteCache } = require('../middleware/cache');
const generateKey = require('../utils/generateKey');
const { MAX_LENGTH } = require('../config');
const { redactIPs } = require('../utils/ipScanner');

const router = express.Router();

router.post('/documents', express.text({ type: '*/*' }), async (req, res) => {
  const text_content = req.body;

  if (!text_content) {
    return res.status(400).json({ error: 'No content provided.' });
  }

  if (text_content.length > MAX_LENGTH) {
    return res.status(400).json({
      error: `Your paste exceeds the maximum allowed character limit of ${MAX_LENGTH} characters.`
    });
  }

  const finalContent = redactIPs(text_content);

  const key = await generateKey();
  const newPaste = await Paste.create({ content: finalContent, key });
  pasteCache.set(key, cachePaste(newPaste));
  res.json({ key });
});

router.get('/documents/:key', async (req, res) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) {
    return res.status(404).json({ error: 'Paste not found.' });
  }
  res.json({
    key: paste.key,
    content: paste.content,
    created_at: paste.created_at.toISOString()
  });
});

module.exports = router;