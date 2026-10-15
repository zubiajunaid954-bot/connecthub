const request = require('supertest');
const app = require('../src/app');
const Notification = require('../src/models/Notification');
const { connect, clear, disconnect, signUp, signUpAdmin } = require('./helpers');

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

const payload = (over = {}) => ({
  title: 'How do React hooks work?',
  body: 'I want to understand useState and useEffect properly.',
  category: 'react',
  tags: ['hooks', 'Beginner'],
  ...over,
});

const createPost = async (agent, over) => {
  const res = await agent.post('/api/posts').send(payload(over));
  return res.body.post;
};

describe('POST /api/posts', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/posts').send(payload());
    expect(res.status).toBe(401);
  });

  it('creates a post with normalised tags and the author attached', async () => {
    const { agent, user } = await signUp();
    const res = await agent.post('/api/posts').send(payload());

    expect(res.status).toBe(201);
    expect(res.body.post).toMatchObject({
      title: 'How do React hooks work?',
      category: 'react',
      tags: ['hooks', 'beginner'],
      score: 0,
      commentCount: 0,
      userVote: 0,
    });
    expect(res.body.post.author.id).toBe(user.id);
    expect(res.body.post.upvotes).toBeUndefined();
  });

  it.each([
    ['missing title', { title: '' }],
    ['unknown category', { category: 'cooking' }],
    ['too many tags', { tags: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    ['empty body', { body: '   ' }],
  ])('rejects %s with 400', async (_label, over) => {
    const { agent } = await signUp();
    const res = await agent.post('/api/posts').send(payload(over));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/posts', () => {
  it('paginates and reports totals', async () => {
    const { agent } = await signUp();
    for (let i = 1; i <= 5; i += 1) await createPost(agent, { title: `Post number ${i}` });

    const res = await request(app).get('/api/posts').query({ page: 2, limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 5, pages: 3 });
    expect(res.body.posts[0].title).toBe('Post number 3'); // newest first: 5,4 | 3,2 | 1
  });

  it('filters by category and tag', async () => {
    const { agent } = await signUp();
    await createPost(agent, { title: 'Node post', category: 'node', tags: ['express'] });
    await createPost(agent, { title: 'React post', category: 'react', tags: ['hooks'] });

    const byCategory = await request(app).get('/api/posts').query({ category: 'node' });
    expect(byCategory.body.posts.map((p) => p.title)).toEqual(['Node post']);

    const byTag = await request(app).get('/api/posts').query({ tag: 'hooks' });
    expect(byTag.body.posts.map((p) => p.title)).toEqual(['React post']);
  });

  it('searches title and body text', async () => {
    const { agent } = await signUp();
    await createPost(agent, { title: 'Indexing strategies', body: 'compound indexes in MongoDB' });
    await createPost(agent, { title: 'Weekend plans', body: 'hiking and coffee' });

    const res = await request(app).get('/api/posts').query({ search: 'mongodb' });
    expect(res.status).toBe(200);
    expect(res.body.posts.map((p) => p.title)).toEqual(['Indexing strategies']);
  });

  it('sorts by score with sort=top', async () => {
    const author = await signUp();
    const voter = await signUp();
    const low = await createPost(author.agent, { title: 'Low scoring post' });
    const high = await createPost(author.agent, { title: 'High scoring post' });
    await voter.agent.post(`/api/posts/${high.id}/vote`).send({ value: 1 });
    await author.agent.post(`/api/posts/${low.id}/vote`).send({ value: -1 });

    const res = await request(app).get('/api/posts').query({ sort: 'top' });
    expect(res.body.posts.map((p) => p.title)).toEqual(['High scoring post', 'Low scoring post']);
  });

  it('rejects an invalid limit', async () => {
    const res = await request(app).get('/api/posts').query({ limit: 500 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/posts/:id', () => {
  it('returns a post, 404 for unknown ids and 400 for malformed ids', async () => {
    const { agent } = await signUp();
    const post = await createPost(agent);

    expect((await request(app).get(`/api/posts/${post.id}`)).status).toBe(200);
    expect((await request(app).get('/api/posts/64b7f0c2a1b2c3d4e5f60718')).status).toBe(404);
    expect((await request(app).get('/api/posts/not-an-id')).status).toBe(400);
  });
});

describe('PATCH/DELETE /api/posts/:id (ownership)', () => {
  it('lets the author edit but not other users', async () => {
    const owner = await signUp();
    const other = await signUp();
    const post = await createPost(owner.agent);

    const ok = await owner.agent.patch(`/api/posts/${post.id}`).send({ title: 'Updated title' });
    expect(ok.status).toBe(200);
    expect(ok.body.post.title).toBe('Updated title');

    const denied = await other.agent.patch(`/api/posts/${post.id}`).send({ title: 'Hijacked title' });
    expect(denied.status).toBe(403);
  });

  it('lets the author or an admin delete, and removes the post comments', async () => {
    const owner = await signUp();
    const admin = await signUpAdmin();
    const other = await signUp();
    const post = await createPost(owner.agent);
    await other.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'nice' });

    expect((await other.agent.delete(`/api/posts/${post.id}`)).status).toBe(403);
    expect((await admin.agent.delete(`/api/posts/${post.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/posts/${post.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/posts/${post.id}/comments`)).status).toBe(404);
  });
});

describe('POST /api/posts/:id/vote', () => {
  it('upvotes, switches to a downvote, and clears the vote', async () => {
    const author = await signUp();
    const voter = await signUp();
    const post = await createPost(author.agent);
    const vote = (value) => voter.agent.post(`/api/posts/${post.id}/vote`).send({ value });

    expect((await vote(1)).body).toEqual({ score: 1, userVote: 1 });
    expect((await vote(-1)).body).toEqual({ score: -1, userVote: -1 });
    expect((await vote(0)).body).toEqual({ score: 0, userVote: 0 });
  });

  it('counts each user once even if they vote repeatedly', async () => {
    const { agent } = await signUp();
    const post = await createPost(agent);
    await agent.post(`/api/posts/${post.id}/vote`).send({ value: 1 });
    const again = await agent.post(`/api/posts/${post.id}/vote`).send({ value: 1 });
    expect(again.body.score).toBe(1);
  });

  it('reports the viewer vote on reads and requires auth to vote', async () => {
    const author = await signUp();
    const voter = await signUp();
    const post = await createPost(author.agent);
    await voter.agent.post(`/api/posts/${post.id}/vote`).send({ value: 1 });

    const mine = await voter.agent.get(`/api/posts/${post.id}`);
    expect(mine.body.post.userVote).toBe(1);
    const anon = await request(app).get(`/api/posts/${post.id}`);
    expect(anon.body.post.userVote).toBe(0);
    expect((await request(app).post(`/api/posts/${post.id}/vote`).send({ value: 1 })).status).toBe(401);
  });

  it('rejects invalid vote values', async () => {
    const { agent } = await signUp();
    const post = await createPost(agent);
    const res = await agent.post(`/api/posts/${post.id}/vote`).send({ value: 5 });
    expect(res.status).toBe(400);
  });
});

describe('comments', () => {
  it('adds a comment, bumps commentCount and notifies the post author', async () => {
    const author = await signUp();
    const commenter = await signUp();
    const post = await createPost(author.agent);

    const res = await commenter.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'Great post!' });
    expect(res.status).toBe(201);
    expect(res.body.comment.author.id).toBe(commenter.user.id);

    expect((await request(app).get(`/api/posts/${post.id}`)).body.post.commentCount).toBe(1);

    // notification is created asynchronously after the response
    await new Promise((r) => setTimeout(r, 100));
    const notifications = await author.agent.get('/api/notifications');
    expect(notifications.body.unread).toBe(1);
    expect(notifications.body.notifications[0]).toMatchObject({ type: 'comment', read: false });
    expect(notifications.body.notifications[0].actor.username).toBe(commenter.user.username);
  });

  it('does not notify you about your own comment', async () => {
    const { agent } = await signUp();
    const post = await createPost(agent);
    await agent.post(`/api/posts/${post.id}/comments`).send({ body: 'talking to myself' });
    await new Promise((r) => setTimeout(r, 100));
    expect(await Notification.countDocuments()).toBe(0);
  });

  it('lists comments oldest first and lets only the author or an admin delete', async () => {
    const author = await signUp();
    const other = await signUp();
    const admin = await signUpAdmin();
    const post = await createPost(author.agent);

    const first = await author.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'first' });
    await other.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'second' });

    const list = await request(app).get(`/api/posts/${post.id}/comments`);
    expect(list.body.comments.map((c) => c.body)).toEqual(['first', 'second']);

    expect((await other.agent.delete(`/api/comments/${first.body.comment.id}`)).status).toBe(403);
    expect((await admin.agent.delete(`/api/comments/${first.body.comment.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/posts/${post.id}`)).body.post.commentCount).toBe(1);
  });

  it('rejects empty comments and comments on missing posts', async () => {
    const { agent } = await signUp();
    const post = await createPost(agent);
    expect((await agent.post(`/api/posts/${post.id}/comments`).send({ body: '  ' })).status).toBe(400);
    expect((await agent.post('/api/posts/64b7f0c2a1b2c3d4e5f60718/comments').send({ body: 'hi' })).status).toBe(404);
  });
});

describe('profiles', () => {
  it('returns profile stats, posts and comments for a user', async () => {
    const { agent, user } = await signUp({ username: 'profileuser' });
    const post = await createPost(agent);
    await agent.post(`/api/posts/${post.id}/comments`).send({ body: 'my comment' });

    const profile = await request(app).get('/api/users/profileuser');
    expect(profile.body.user.username).toBe('profileuser');
    expect(profile.body.user.email).toBeUndefined();
    expect(profile.body.stats).toMatchObject({ posts: 1, comments: 1 });

    const posts = await request(app).get('/api/users/profileuser/posts');
    expect(posts.body.posts[0].author.id).toBe(user.id);
    const comments = await request(app).get('/api/users/profileuser/comments');
    expect(comments.body.comments[0].post.title).toBe(post.title);
    const activity = await request(app).get('/api/users/profileuser/activity');
    expect(activity.body.activity).toHaveLength(2);

    expect((await request(app).get('/api/users/nobodyhere')).status).toBe(404);
  });
});

describe('unknown routes', () => {
  it('returns a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
