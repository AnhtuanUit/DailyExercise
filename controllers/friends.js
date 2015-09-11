var mongoose = require('mongoose');
var Friend = mongoose.model('Friend');
var Users = mongoose.model('Users');
var Utilities = require('../config/utilities');
var async = require('async');

exports.queryFriend = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid friend id', 404));
        } else {
            Friend.findOne({
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


exports.addFriend = function  (req, res) {
	var friend = new Friend(req.body);

	friend.save(function  (err) {
        if(err){
            return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
        } else {
            console.log({friendId : friend._id});
            return res.jsonp(Utilities.response(true, {} ));
        }
});
};

exports.acceptFriend = function(req, res) {
    var friend = req.friendData;
    
    friend.update({
                'success': true
            }, function(err) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else {
                    return res.jsonp(Utilities.response(true, {}));
                }
            });
};

exports.getFriendsById = function  (req, res) {
	var userId = req.params.userId ? req.params.userId.toString() : "";

    var allFriend ;
	Friend.find({$or: [{'senderId': userId},{'receiverId': userId}], success: true}, function  (err, friend) {
    	if (err) {
            return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
    	} else {
            async.map(friend, function(friend, cb) {
                Friend.getUserId(friend, userId, function(u) {
                    return cb(null, u);
                });
            }, function(err, data) {
                Users.find({$or: data},function(err, users) {
                    if (err || !users.length) {
                        return res.jsonp(Utilities.response(false, []));
                    } else {
                        async.map(users, function(user, cb) {
                            Users.detail(user, null, function(u) {
                                return cb(null, u);
                            });
                        }, function(err, data) {
                            return res.jsonp(Utilities.response(true, data));
                        });
                    }
                });
            });
        }
    });
};

