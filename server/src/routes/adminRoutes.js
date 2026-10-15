const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const { banSchema, adminUsersQuery } = require('../validators/misc');
const { ROLES } = require('../config/constants');

router.use(protect, requireRole(ROLES.ADMIN));

router.get('/stats', ctrl.stats);
router.get('/users', validate(adminUsersQuery, 'query'), ctrl.listUsers);
router.patch('/users/:id/ban', validate(idParam, 'params'), validate(banSchema), ctrl.setBanned);

module.exports = router;
