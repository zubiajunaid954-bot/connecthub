/* Seeds sample users, posts, comments, votes and chat messages.
 *   npm run seed            -> wipes ConnectHub collections, then inserts demo data
 * Refuses to run when NODE_ENV=production unless --force is passed. */
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const DEMO_PASSWORD = 'Password123!';
const ADMIN_PASSWORD = 'Admin123!';

// Deterministic PRNG so every seed run produces the same data.
const mulberry32 = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const USERS = [
  { username: 'admin', email: 'admin@connecthub.dev', role: 'admin', bio: 'Keeping the community friendly.', password: ADMIN_PASSWORD },
  { username: 'alice', email: 'alice@connecthub.dev', bio: 'Frontend dev. React and a lot of coffee.' },
  { username: 'bob', email: 'bob@connecthub.dev', bio: 'Backend engineer who loves Node and Postgres... and Mongo.' },
  { username: 'carol', email: 'carol@connecthub.dev', bio: 'Full-stack, always shipping side projects.' },
  { username: 'dave', email: 'dave@connecthub.dev', bio: 'Career switcher, learning in public.' },
  { username: 'erin', email: 'erin@connecthub.dev', bio: 'Database nerd. Indexes are my love language.' },
];

const POSTS = [
  ['Welcome to ConnectHub!', 'general', ['welcome', 'community'], 'Say hi, introduce yourself and tell us what you are building. Be kind, be curious, and help each other out.'],
  ['What are you working on this week?', 'general', ['weekly', 'discussion'], 'Share your current project, your biggest blocker, or something you learned. Weekly thread - add yours below.'],
  ['useEffect cleanup: when do you really need it?', 'react', ['hooks', 'useeffect'], 'I keep seeing effects without cleanup functions. Subscriptions, timers and sockets definitely need one. What about plain fetch calls? I use an `ignore` flag to avoid state updates after unmount - is AbortController better?'],
  ['Context API vs Redux Toolkit in 2026', 'react', ['state-management', 'redux'], 'For small apps Context plus useReducer covers most needs. When do you reach for Redux Toolkit? Performance, devtools, or team conventions?'],
  ['Server components changed how I fetch data', 'react', ['rsc', 'data-fetching'], 'After moving a dashboard to server components, the client bundle dropped a lot. Curious whether others hit hydration or caching surprises.'],
  ['Async/await error handling patterns in Express', 'node', ['express', 'errors', 'async'], 'I wrap every handler in an asyncHandler and funnel everything into a central error middleware. Anyone doing something smarter than try/catch everywhere?'],
  ['Socket.io rooms vs namespaces', 'node', ['socket.io', 'websockets'], 'I use one room per chat category and a personal room per user for notifications. When would you actually pick namespaces instead?'],
  ['How to structure a Node API: controllers, services, repositories?', 'node', ['architecture', 'clean-code'], 'Controllers stay thin (HTTP only), services hold business rules, models talk to the DB. Do you add a repository layer on top of Mongoose?'],
  ['Mongo index design: compound index order matters', 'databases', ['mongodb', 'indexes', 'performance'], 'Equality first, then sort, then range (ESR rule). I cut a feed query from 800ms to 6ms by reordering fields in one compound index.'],
  ['Text search in MongoDB vs Atlas Search', 'databases', ['mongodb', 'search'], '$text works for simple keyword search but has no fuzzy matching. At what scale did you move to Atlas Search?'],
  ['Embedding vs referencing for comments', 'databases', ['mongodb', 'schema-design'], 'I reference comments from their own collection because threads grow unbounded. Embedded arrays would hit the 16MB limit eventually.'],
  ['How I landed my first dev job after a bootcamp', 'career', ['jobs', 'interview', 'portfolio'], 'Three deployed full-stack projects with READMEs, a clean GitHub, and being able to explain every architectural decision in an interview. Real-time features stood out.'],
  ['Portfolio projects that actually impress recruiters', 'career', ['portfolio', 'advice'], 'Skip the todo app. Build something with auth, real-time, tests and a live demo. Document trade-offs in the README.'],
  ['Show HN style: I built a markdown notes app', 'showcase', ['project', 'markdown'], 'Built with React, Express and Mongo. Supports tags, full text search and keyboard shortcuts. Feedback on the UX welcome!'],
  ['Tailwind CSS: utility classes or component classes?', 'javascript', ['css', 'tailwind'], 'I use utilities in JSX and extract with @apply only for truly repeated pieces such as buttons. Where do you draw the line?'],
  ['Why does `this` still trip people up?', 'javascript', ['fundamentals', 'closures'], 'Arrow functions capture lexical this, regular functions get it from the call site. A short mental model: look at what is left of the dot at call time.'],
];

const COMMENTS = [
  'Great question - I ran into this last month and ended up with the same approach.',
  'Thanks for sharing, this is really helpful!',
  'I would add a test around that edge case, it bit me in production once.',
  'Interesting trade-off. Have you benchmarked it with realistic data?',
  'Totally agree. Keeping things simple scales further than people expect.',
  'Bookmarking this thread. Would love a follow-up post with code.',
  'Counterpoint: it depends on team size, but for small teams this works great.',
  'This is the clearest explanation I have read so far.',
  'We do the same thing at work and it has been solid for two years.',
  'Welcome! Glad to have you here.',
];

const CHAT = [
  ['general', 'alice', 'Hey everyone, happy to be here!'],
  ['general', 'bob', 'Welcome Alice! What are you building?'],
  ['general', 'alice', 'A dashboard in React. Fighting with useEffect right now.'],
  ['react', 'carol', 'Anyone tried the new compiler yet?'],
  ['react', 'alice', 'Yes - fewer useMemo calls in my code, nice quality of life.'],
  ['node', 'bob', 'Reminder: always validate request bodies, even internal ones.'],
  ['databases', 'erin', 'Pro tip: run explain() before blaming the database.'],
];

const seed = async () => {
  if (env.isProd && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed in production without --force');
  }
  const rand = mulberry32(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  await Promise.all([User, Post, Comment, Message, Notification].map((M) => M.deleteMany({})));
  await Promise.all([User, Post, Comment, Message, Notification].map((M) => M.init()));

  // create() runs the bcrypt pre-save hook for each user.
  const users = await User.create(USERS.map((u) => ({ password: DEMO_PASSWORD, ...u })));
  const byName = Object.fromEntries(users.map((u) => [u.username, u]));
  const normal = users.filter((u) => u.role === 'user');
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const postDocs = POSTS.map(([title, category, tags, body], i) => {
    const author = i === 0 || i === 1 ? byName.admin : normal[i % normal.length];
    const createdAt = new Date(now - (POSTS.length - i) * DAY * 0.8 - rand() * DAY);
    const upvotes = [];
    const downvotes = [];
    users.forEach((u) => {
      const r = rand();
      if (r < 0.55) upvotes.push(u._id);
      else if (r < 0.65) downvotes.push(u._id);
    });
    return {
      title, category, tags, body, author: author._id, createdAt, updatedAt: createdAt,
      upvotes, downvotes, score: upvotes.length - downvotes.length,
    };
  });
  const posts = await Post.insertMany(postDocs);

  const commentDocs = [];
  posts.forEach((post) => {
    const count = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i += 1) {
      const author = pick(users.filter((u) => String(u._id) !== String(post.author)));
      const createdAt = new Date(post.createdAt.getTime() + (i + 1) * 3600 * 1000 * (1 + rand() * 6));
      commentDocs.push({ post: post._id, author: author._id, body: pick(COMMENTS), createdAt, updatedAt: createdAt });
    }
  });
  const comments = await Comment.insertMany(commentDocs);

  const counts = comments.reduce((acc, c) => ({ ...acc, [c.post]: (acc[c.post] || 0) + 1 }), {});
  await Post.bulkWrite(
    posts.map((p) => ({ updateOne: { filter: { _id: p._id }, update: { $set: { commentCount: counts[p._id] || 0 } } } })),
    { timestamps: false }
  );

  await Message.insertMany(
    CHAT.map(([category, username, body], i) => ({
      category, body, author: byName[username]._id,
      createdAt: new Date(now - (CHAT.length - i) * 60 * 1000),
    }))
  );

  console.log(`Seeded ${users.length} users, ${posts.length} posts, ${comments.length} comments, ${CHAT.length} chat messages.`);
  console.log('\nLogin credentials:');
  console.log(`  admin: admin@connecthub.dev / ${ADMIN_PASSWORD}`);
  console.log(`  users: alice|bob|carol|dave|erin@connecthub.dev / ${DEMO_PASSWORD}`);
};

if (require.main === module) {
  (async () => {
    try {
      env.assertConfigured();
      await connectDB(env.mongoUri);
      await seed();
      await mongoose.connection.close();
      process.exit(0);
    } catch (err) {
      console.error('Seed failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = seed;
