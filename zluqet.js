// zluqet.js

const express      = require('express');
const path         = require('path');
const Sequelize    = require('sequelize');
const { DataTypes }= Sequelize;
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const { LRUCache } = require('lru-cache');

const app = express();
app.set('trust proxy', 1);

// —————————————
// Static files
// —————————————
app.use(express.static(path.join(__dirname, 'static')));

// —————————————
// View engine
// —————————————
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');

// —————————————
// Middleware
// —————————————
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false, limit: '1mb' }));
app.use(bodyParser.text({ type: 'text/plain', limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));

// —————————————
// Database (SQLite + Sequelize)
// —————————————
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'instance/pastes.db'),
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});

sequelize.authenticate()
  .then(async () => {
    await sequelize.query('PRAGMA synchronous = OFF');
    await sequelize.query('PRAGMA journal_mode = WAL');
    await sequelize.query('PRAGMA cache_size = 10000');
  })
  .catch(console.error);

const Paste = sequelize.define('Paste', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  content:    { type: DataTypes.TEXT,    allowNull: false },
  key:        { type: DataTypes.STRING(8), unique: true, allowNull: false },
  created_at: { type: DataTypes.DATE,    allowNull: false, defaultValue: Sequelize.NOW }
}, {
  tableName: 'pastes',
  timestamps: false
});

sequelize.sync();

// —————————————
// Rate limiting (simple IP-based for /api/)
// —————————————
const ipRequests = new Map();
const EXEMPT_IPS = new Set();
const REQUESTS_PER_MINUTE = 5;

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
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
  }
  next();
});

// —————————————
// In-memory caching for database lookups
// —————————————
const pasteCache = new LRUCache({ max: 1000 });

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

// —————————————
// Utility: generate a unique 8-char key
// —————————————
async function generateKey(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key, exists;
  do {
    key = Array.from({ length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    exists = await Paste.findOne({ where: { key } });
  } while (exists);
  return key;
}

const MAX_LENGTH = 25000;

// —————————————
// Routes
// —————————————

// Home / New Paste
app.get('/', (req, res) => {
  res.render('index', { content: '', error: null });
});

app.post('/', async (req, res) => {
  const content = req.body.content;
  if (!content) return res.redirect('/');
  if (content.length > MAX_LENGTH) {
    return res.status(400).render('index', {
      content,
      error: `Your paste exceeds the maximum allowed character limit of ${MAX_LENGTH} characters. Please reduce your content before saving.`
    });
  }

  const key = await generateKey();
  const newPaste = await Paste.create({ content, key });
  pasteCache.set(key, cachePaste(newPaste));
  res.redirect(`/${key}`);
});

// View Paste (HTML)
app.get('/:key', async (req, res, next) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) return next();

  // Format created_at for display
  const dt = new Date(paste.created_at);
  const opts = {
    month:   'short',
    day:     '2-digit',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    hour12:  false
  };
  const formattedDate = dt.toLocaleString('en-US', opts).replace(',', '');

  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.render('view_paste', { paste, formattedDate });
});

// View Paste (raw text)
app.get('/raw/:key', async (req, res, next) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) return next();
  res.type('text/plain').send(paste.content);
});

// Edit / Duplicate Paste
app.get('/edit/:key', async (req, res, next) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) return next();
  res.render('edit_paste', { paste, error: null });
});

app.post('/edit/:key', async (req, res, next) => {
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

  const newKey = await generateKey();
  const newPaste = await Paste.create({ content, key: newKey });
  pasteCache.set(newKey, cachePaste(newPaste));
  res.redirect(`/${newKey}`);
});

// API: create a paste
app.post('/api/documents', async (req, res) => {
  const text_content = req.body;
  if (!text_content) {
    return res.status(400).json({ error: 'No content provided.' });
  }
  if (text_content.length > MAX_LENGTH) {
    return res.status(400).json({ error: `Your paste exceeds the maximum allowed character limit of ${MAX_LENGTH} characters.` });
  }

  const key = await generateKey();
  const newPaste = await Paste.create({ content: text_content, key });
  pasteCache.set(key, cachePaste(newPaste));
  res.json({ key });
});

// API: retrieve a paste
app.get('/api/documents/:key', async (req, res) => {
  const paste = await getPasteByKey(req.params.key);
  if (!paste) {
    return res.status(404).json({ error: 'Paste not found.' });
  }
  res.json({
    key:        paste.key,
    content:    paste.content,
    created_at: paste.created_at.toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404');
});

// Error handler for oversized bodies
app.use((err, req, res, next) => {
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).render('errors/too_large', {
      error: `Your paste is too large! The maximum allowed size is ${MAX_LENGTH} characters. Please reduce your content and try again.`
    });
  }
  next(err);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
