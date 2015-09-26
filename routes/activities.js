var express = require('express');
var router = express.Router();
var ActivitesController = require('../controllers/activities');
var middleware = require('../config/middleware');


//router.get('/getAllActivities', ActivitesController.getAllActivities);

router.get('/getActivities', ActivitesController.getActivities);

router.delete('/removeActivityByActivityId/:activityId', ActivitesController.removeActivityByActivityId);

router.param('activityId', ActivitesController.queryActivity);

module.exports = router;
