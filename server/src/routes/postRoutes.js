const router = require('express').Router();
const postCtrl = require('../controllers/postController');
const commentCtrl = require('../controllers/commentController');
const validate = require('../middleware/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { idParam } = require('../validators/common');
const {
  createPostSchema,
  updatePostSchema,
  listPostsQuery,
  voteSchema,
  commentSchema,
  listCommentsQuery,
} = require('../validators/post');

const withId = validate(idParam, 'params');

router.get('/', optionalAuth, validate(listPostsQuery, 'query'), postCtrl.list);
router.post('/', protect, writeLimiter, validate(createPostSchema), postCtrl.create);

router.get('/:id', optionalAuth, withId, postCtrl.get);
router.patch('/:id', protect, withId, validate(updatePostSchema), postCtrl.update);
router.delete('/:id', protect, withId, postCtrl.remove);
router.post('/:id/vote', protect, withId, validate(voteSchema), postCtrl.vote);

router.get('/:id/comments', withId, validate(listCommentsQuery, 'query'), commentCtrl.listForPost);
router.post('/:id/comments', protect, writeLimiter, withId, validate(commentSchema), commentCtrl.create);

module.exports = router;
