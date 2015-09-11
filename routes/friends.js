var express = require('express');
var router = express.Router();
var FriendsController = require('../controllers/friends');

/* GET */
router.get('/getFriendsById/:userId', FriendsController.getFriendsById);

/* POST */
router.post('/addFriend', FriendsController.addFriend);
router.post('/acceptFriend/:friendId', FriendsController.acceptFriend);

/* DELETE */

router.param('friendId', FriendsController.queryFriend); // Object


module.exports = router;
