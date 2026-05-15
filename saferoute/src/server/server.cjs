const jsonServer = require('json-server');
const path = require('path');

const server      = jsonServer.create();
const router      = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// ── CORS ─────────────────────────────────────────────────────────────────────
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ── Custom auth routes ────────────────────────────────────────────────────────

// POST /authentication/sign-in
server.post('/authentication/sign-in', (req, res) => {
  const { email, password } = req.body || {};
  const users = router.db.get('users').value() || [];
  const user  = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'invalid-credentials' });
  return res.json({
    token:          `dev-token-${user.id}-${Date.now()}`,
    id:             user.id,
    firstName:      user.firstName,
    lastName:       user.lastName,
    email:          user.email,
    roleTier:       user.roleTier,
    organizationId: user.organizationId,
  });
});

// POST /authentication/sign-up  (registers a new user)
server.post('/authentication/sign-up', (req, res) => {
  const body  = req.body || {};
  const users = router.db.get('users');
  if (users.value().some(u => u.email === body.email)) {
    return res.status(409).json({ message: 'email-already-registered' });
  }
  const existing = users.value();
  const nextId   = `u-${Date.now()}`;
  const newUser  = { id: nextId, ...body };
  users.push(newUser).write();
  return res.status(201).json(newUser);
});

// ── Auto-assign prefixed string IDs on POST (avoids json-server's random IDs) ─
server.use((req, res, next) => {
  if (req.method === 'POST' && req.body && !req.body.id) {
    const collection = req.path.replace('/', '').split('/')[0]; // e.g. "organizations"
    const prefixMap  = {
      organizations: 'org',
      users:         'u',
      subscriptions: 'sub',
      routes:        'route',
      trips:         'trip-execution-and-monitoring',
      profiles:      'profile',
      parents:       'p',
      children:      'c',
      vehicles:      'v',
      incidents:     'i',
      notifications: 'n',
    };
    const prefix = prefixMap[collection] || collection;
    req.body.id  = `${prefix}-${Date.now()}`;
  }
  next();
});

// ── json-server handles all other REST routes ─────────────────────────────────
server.use(router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\nSafeRoute json-server running on http://localhost:${PORT}`);
  console.log(`DB:   src/server/db.json`);
  console.log(`Auth: POST /authentication/sign-in`);
  console.log(`      POST /authentication/sign-up`);
  console.log(`REST: /organizations  /users  /routes  /trips  /vehicles`);
  console.log(`      /parents  /children  /plans  /subscriptions`);
  console.log(`      /notifications  /incidents  /profiles\n`);
});
