const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { idParam } = require('../validators/common');

router.use(protect);

router.get('/', ctrl.list);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', validate(idParam, 'params'), ctrl.markRead);

module.exports = router;
