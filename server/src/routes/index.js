const router = require('express').Router();
const { CATEGORIES } = require('../config/constants');

router.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
router.get('/categories', (req, res) => res.json({ categories: CATEGORIES }));

router.use('/auth', require('./authRoutes'));
router.use('/posts', require('./postRoutes'));
router.use('/comments', require('./commentRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/chat', require('./chatRoutes'));
router.use('/admin', require('./adminRoutes'));

module.exports = router;
