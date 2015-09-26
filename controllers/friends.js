var mongoose = require('mongoose');
var Friends = mongoose.model('Friends');
var Users = mongoose.model('Users');
var Utilities = require('../config/utilities');
var async = require('async');

exports.queryFriend = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid friend id', 404));
        } else {
            Friends.findOne({
                '_id': id
            }).exec(function(err, friend) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!friend) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'Friend not found', 404));
                } else {
                    req.friendData = friend;
                    return next();
                }
            });
        }
    });
};
