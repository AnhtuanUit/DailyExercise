var mongoose = require('mongoose');
var Friend = mongoose.model('Friend');
var Users = mongoose.model('Users');
var Utilities = require('../config/utilities');
var async = require('async');

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
    var friendId = req.params.friendId ? req.params.friendId.toString() : "";

    Friend.findOne({'_id': friendId}, function  (err, friend) {
    	 if (!friend) {
            return res.jsonp(Utilities.response(false, {}, 'Khong ton tai loi moi ket ban'));
        } else {
            friend.update({
                'success': true
            }, function(err) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else {
                    return res.jsonp(Utilities.response(true, {}));
                }
            });
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

