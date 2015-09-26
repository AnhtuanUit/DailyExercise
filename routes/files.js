var express = require('express');
var router = express.Router();
var FilesController = require('../controllers/files');
var multer = require('multer');

var uploading = multer({
  limits: {fileSize: 1000000, files:1}
})


/*GET*/
router.get('/getAllFile/:userId', FilesController.getAllFile);
router.get('/getFileByPath/:filePath', FilesController.getFileByPath);
/*POST*/
router.post('/uploadFile',uploading, FilesController.uploadFile);

/*DELETE*/
//router.delete('/deleteFileById/:fileId', FilesController.deleteFileById);

router.param('fileId', FilesController.queryFile);

module.exports = router;

