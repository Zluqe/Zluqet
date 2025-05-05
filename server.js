// =====================================
// Server, puts everything together
// Created by Person0z
// Copyright (c) 2025 Zluqe
// =====================================

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { PORT, MAX_LENGTH } = require('./config');
const rateLimiter = require('./middleware/rateLimiter');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');

const app = express();
app.set('trust proxy', 1);

app.use(express.static(path.join(__dirname, 'static')));
app.set('views', path.join(__dirname, 'web'));
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
app.use(bodyParser.text({ type: 'text/plain', limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));

app.use('/api', rateLimiter);
app.use('/', webRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('errors/404');
});

app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).render('errors/too_large', {
      error: `Your paste is too large! The maximum allowed size is ${MAX_LENGTH} characters. Please reduce your content and try again.`
    });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});