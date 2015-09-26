var express = require('express');
var router = express.Router();
var MessagesController = require('../controllers/messages');
var middleware = require('../config/config');

router.get('/getRoomMessagesByUserId/:targetId', MessagesController.getRoomMessagesByTargetId);

module.exports = router;