const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { categoryParam, chatHistoryQuery } = require('../validators/misc');

router.get('/:category/messages', protect, validate(categoryParam, 'params'), validate(chatHistoryQuery, 'query'), ctrl.history);

module.exports = router;
