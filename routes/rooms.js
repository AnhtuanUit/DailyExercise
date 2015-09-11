var express = require('express');
var router = express.Router();
var RoomsController = require('../controllers/rooms');
var middleware = require('../config/middleware');

/* GET */
// router.get('/getRoomInformation/:leanRoomId', middleware.isInRoom, RoomsController.getRoomInformation);
router.get('/getAllRooms', RoomsController.getAllRooms);

/* PUT */
router.put('/changeRoomTitle/:roomId', middleware.isInRoom, RoomsController.changeRoomTitle);

/* MIDDLEWARE */
router.param('leanRoomId', RoomsController.queryLeanRoom);
router.param('roomId', RoomsController.queryRoom);

module.exports = router;