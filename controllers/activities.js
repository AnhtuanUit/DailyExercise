var mongoose = require('mongoose');
var Activities = mongoose.model('Activities');
var Utilities = require('../config/utilities');
var async = require('async');
var Config = require('../config/config');


exports.queryActivity = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid activity id', 404));
        } else {
            Activities.findOne({
                '_id': id
            }).exec(function(err, activity) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!activity) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'Activity not found', 404));
                } else {
                    req.activityData = activity;
                    return next();
                }
            });
        }
    });
};


exports.getAllActivities = function  (req, res) {

    Activities.find({})
    .lean()
    .exec ( function  (err, activity) {
        if (!err) {
            async.map(activity, function(act, cb) {

             Activities.detail(act, req.user, function  (data) {

                return cb(null, data);
            });

         }, function(err, data) {
            return res.jsonp(Utilities.response(true, data));
        });
        }
    });
}

exports.getActivities = function  (req, res) {
    var userId = req.user._id;

    Activities.find({'_uTargetId':userId, })
    .lean()
    .exec ( function  (err, activity) {
        if (!err) {
            async.map(activity, function(act, cb) {

            mongoose.model('Users').findOne({'_id': act._userId})
            .lean()
            .exec
            (function  (err, user) {
                 Activities.detail(act, user, function  (data) {

                return cb(null, data);
            });
            });

         }, function(err, data) {
            return res.jsonp(Utilities.response(true, data));
        });
        }
    });

}

exports.removeActivityByActivityId =function  (req, res) {
    var activityId = req.activityData._id;
    var userId = req.user._id;
    Activities.findOne({'_id': activityId}, function  (err, activity) {
        if(activity){
            activity.remove(function  (err) {
               if(err){
                res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
            } else {
                res.jsonp(Utilities.response(true));
            }
        });
        } else {
            res.jsonp(Utilities.response(false, {}, 'Activity not found'));
        }
    });
}



