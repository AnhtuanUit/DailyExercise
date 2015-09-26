var mongoose = require('mongoose');
var Notifys = mongoose.model('Notifys');
var Users = mongoose.model('Users');
var Utilities = require('../config/utilities');
var async = require('async');


exports.queryNotify = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid notify id', 404));
        } else {
            Notifys.findOne({
                '_id': id
            }).exec(function(err, notify) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!friend) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'Notify not found', 404));
                } else {
                    req.notifyData = notify;
                    return next();
                }
            });
        }
    });
};


exports.getNotify = function  (req, res) {
    var userId = req.user._id;
    
    Notifys.find({'userId': userId}, function  (err, notifys) {
        if(!err){
           async.map(notifys, function(notify, cb) {
            Users.findOne({'_id': notify.senderId},function  (err, user) {
                
                Users.detail(user, null, function  (data) {
                 Notifys.detail(notify, data, function(u) {
                    return cb(null, u);
                });
             });
            });
            
        }, function(err, data) {
            return res.jsonp(Utilities.response(true, data));
        });
       }
       else return res.jsonp(lost);
       
   });
}


exports.createNotify = function  (req, res) {
    
}