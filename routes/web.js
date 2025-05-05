// =====================================
// Web pastebin routes
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const express = require('express');
const Paste = require('../models/paste');
const { getPasteByKey, cachePaste, pasteCache } = require('../middleware/cache');
const generateKey = require('../utils/generateKey');
const formatDate = require('../utils/formatDate');
const { MAX_LENGTH } = require('../config');
const { redactIPs } = require('../utils/ipScanner');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { content: '', error: null });
});

router.post('/', async (req, res) => {
  const content = req.body.content;
  if (!content) return res.redirect('/');

  if (content.length > MAX_LENGTH) {
    return res.status(400).render('index', {
      content,
      error: `Your paste exceeds the maximum allowed character limit of ${MAX_LENGTH} characters. Please reduce your content before saving.`
    });
  }

  const finalContent = redactIPs(content);

  const key = await generateKey();
  const newPaste = await Paste.create({ content: finalContent, key });
  pasteCache.set(key, cachePaste(newPaste));
  res.redirect(`/${key}`);
});

router.get('/:key', async (req, res, next) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) return next();

  const formattedDate = formatDate(paste.created_at);
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.render('view_paste', { paste, formattedDate });
});

router.get('/raw/:key', async (req, res, next) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) return next();
  res.type('text/plain').send(paste.content);
});

router.get('/edit/:key', async (req, res, next) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) return next();
  res.render('edit_paste', { paste, error: null });
});

router.post('/edit/:key', async (req, res, next) => {
  const original = await getPasteByKey(req.params.key);
  if (!original) return next();

  const content = req.body.content;
  if (!content) return res.redirect('/');

  if (content.length > MAX_LENGTH) {
    return res.status(400).render('edit_paste', {
      paste: original,
      error: `Your paste exceeds the maximum allowed character limit of ${MAX_LENGTH} characters. Please reduce your content before saving.`
    });
  }

  const finalContent = redactIPs(content); // Automatically censor IPs

  const newKey = await generateKey();
  const newPaste = await Paste.create({ content: finalContent, key: newKey });
  pasteCache.set(newKey, cachePaste(newPaste));
  res.redirect(`/${newKey}`);
});

module.exports = router;
