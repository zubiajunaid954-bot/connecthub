const router = require('express').Router();
const ctrl = require('../controllers/userController');
const validate = require('../middleware/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { usernameParam, pageQuery } = require('../validators/common');
const { listPostsQuery } = require('../validators/post');
const { updateProfileSchema } = require('../validators/auth');

const withUsername = validate(usernameParam, 'params');

router.patch('/me', protect, validate(updateProfileSchema), ctrl.updateMe);

router.get('/:username', withUsername, ctrl.getProfile);
router.get('/:username/posts', optionalAuth, withUsername, validate(listPostsQuery, 'query'), ctrl.getPosts);
router.get('/:username/comments', withUsername, validate(pageQuery, 'query'), ctrl.getComments);
router.get('/:username/activity', withUsername, ctrl.getActivity);

module.exports = router;
