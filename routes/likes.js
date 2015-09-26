var express = require('express');
var router = express.Router();
var LikesController = require('../controllers/likes');

/* POST */
router.post('/:targetId', LikesController.like);

module.exports = router;