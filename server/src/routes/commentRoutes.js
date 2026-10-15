const router = require('express').Router();
const ctrl = require('../controllers/commentController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { idParam } = require('../validators/common');

router.delete('/:id', protect, validate(idParam, 'params'), ctrl.remove);

module.exports = router;
