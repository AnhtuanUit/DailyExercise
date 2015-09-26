var express = require('express');
var router = express.Router();
var NotifysController = require('../controllers/notifys');


router.get('/getNotify', NotifysController.getNotify);

router.param('notifyId', NotifysController.queryNotify); 
module.exports = router;
