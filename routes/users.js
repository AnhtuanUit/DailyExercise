var express = require('express');
var router = express.Router();
var UsersController = require('../controllers/users');
var middleware = require('../config/middleware');

/* GET */
router.get('/getUserById/:leanUserId', UsersController.getUserById);

router.get('/', function  (req, res) {
	res.jsonp({'title': 'zz'});
});
// router.get('/getUserUnreadMessages', UsersController.getUserUnreadMessages);

router.get('/getAllFriends', UsersController.getAllFriends);
router.get('/getChatHistory', UsersController.getChatHistory);
router.get('/getContact', UsersController.getContact);

/* POST */
router.post('/signup', UsersController.signup);
router.post('/login', UsersController.login);
router.post('/logout', UsersController.logout);


router.put('/changePassword/:userId', middleware.isAuthentication, UsersController.changePassword);
router.put('/changeAvatar/:userId', middleware.isAuthentication, UsersController.changeAvatar);


/* DELETE */
router.delete('/inactiveUserById/:userId', middleware.isAdmin, UsersController.inactiveUserById);

/* MIDDLEWARE */
router.param('leanUserId', UsersController.queryLeanUser); // Lean
router.param('userId', UsersController.queryUser); // Object

module.exports = router;
