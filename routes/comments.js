var express = require('express');
var router = express.Router();
var CommentsController = require('../controllers/comments');
var middleware = require('../config/middleware');

/* GET */
router.get('/getComments/:newsId', CommentsController.getComments);

/* POST */
router.post('/createComment/:newsId', CommentsController.createComment);

/* DELETE */
router.delete('/deleteCommentById/:commentId', middleware.isCommentCreator, CommentsController.deleteCommentById);

/* MIDDLEWARE */
router.param('commentId', CommentsController.queryComment); // Object

module.exports = router;