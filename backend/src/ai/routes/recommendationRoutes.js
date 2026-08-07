const express = require('express');
const { protect } = require('../../middleware');
const { recommend } = require('../controllers/recommendationController');

const router = express.Router();

router.post('/recommend', protect, recommend);

module.exports = router;
