// Shapes DB documents (lean or hydrated) into the public JSON the API returns.
// Centralised so no route can accidentally leak a password hash or vote arrays.

const idOf = (v) => (v == null ? null : String(v._id || v));

const author = (a) =>
  a && a.username
    ? { id: idOf(a), username: a.username, role: a.role }
    : { id: idOf(a), username: '[deleted]', role: 'user' };

const user = (u) => ({
  id: idOf(u),
  username: u.username,
  email: u.email,
  role: u.role,
  bio: u.bio || '',
  isBanned: Boolean(u.isBanned),
  createdAt: u.createdAt,
});

const publicUser = (u) => ({
  id: idOf(u),
  username: u.username,
  role: u.role,
  bio: u.bio || '',
  createdAt: u.createdAt,
});

const post = (p, viewerId) => {
  const uid = viewerId ? String(viewerId) : null;
  const has = (arr = []) => Boolean(uid) && arr.some((x) => String(x) === uid);
  return {
    id: idOf(p),
    title: p.title,
    body: p.body,
    category: p.category,
    tags: p.tags || [],
    author: author(p.author),
    score: p.score,
    commentCount: p.commentCount,
    userVote: has(p.upvotes) ? 1 : has(p.downvotes) ? -1 : 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

const comment = (c) => ({
  id: idOf(c),
  body: c.body,
  author: author(c.author),
  post:
    c.post && c.post.title !== undefined
      ? { id: idOf(c.post), title: c.post.title }
      : { id: idOf(c.post) },
  createdAt: c.createdAt,
});

const message = (m) => ({
  id: idOf(m),
  category: m.category,
  body: m.body,
  author: author(m.author),
  createdAt: m.createdAt,
});

const notification = (n) => ({
  id: idOf(n),
  type: n.type,
  read: n.read,
  actor: author(n.actor),
  post: n.post ? { id: idOf(n.post), title: n.post.title } : null,
  createdAt: n.createdAt,
});

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { user, publicUser, post, comment, message, notification, pagination };
