var express = require('express');
var router = express.Router();
var MessagesController = require('../controllers/messages');
var middleware = require('../config/config');

/* GET */
router.get('/getRoomMessagesByRoomId/:roomId', MessagesController.getRoomMessagesByRoomId);
router.get('/getRoomMessagesByUserId/:targetId', MessagesController.getRoomMessagesByUserId);
router.get('/getMessageFileUrlById/:messageId', MessagesController.getMessageFileUrlById);

/* MIDDLEWARE */
router.param('messageId', MessagesController.queryLeanMessage);

module.exports = router;