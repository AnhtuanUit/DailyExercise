var express = require('express');
var router = express.Router();
var NewsController = require('../controllers/news');


router.get('/getAllNews', NewsController.getAllNews);

router.post('/createNews', NewsController.createNews);

router.delete('/removeNewsByNewsId/:newsId', NewsController.removeNewsByNewsId);

router.param('newsId', NewsController.queryNews); 

module.exports = router;
