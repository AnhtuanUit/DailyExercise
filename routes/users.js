var express = require('express');
var router = express.Router();
var UsersController = require('../controllers/users');
var middleware = require('../config/middleware');

/* GET */
router.get('/getAllFriends', UsersController.getAllFriends);
/* POST */
router.post('/signup', UsersController.signup);
router.post('/login', UsersController.login);
router.post('/logout', UsersController.logout);

/* PUT */
router.put('/changePassword/:userId', middleware.isAuthentication, UsersController.changePassword);

/* DELETE */
router.param('leanUserId', UsersController.queryLeanUser); // Lean
router.param('userId', UsersController.queryUser); // Object

module.exports = router;
