var mongoose = require('mongoose');
var Rooms = mongoose.model('Rooms');
var Users = mongoose.model('Users');
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var async = require('async');

// Middleware
exports.queryLeanRoom = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.jsonp(Utilities.response(false, {}, 'Invalid room id'));
        } else {
            Rooms.findOne({
                    '_id': id
                })
                .populate('members', Config.Populate.User)
                .lean().exec(function(err, room) {
                    if (err) {
                        return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                    } else if (!room) {
                        return res.status(404).jsonp(Utilities.response(false, {}, 'Room not found', 404));
                    } else {
                        req.roomData = room;
                        return next();
                    }
                });
        }
    });
};

exports.queryRoom = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.jsonp(Utilities.response(false, {}, 'Invalid room id'));
        } else {
            Rooms.findOne({
                '_id': id
            }).exec(function(err, room) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!room) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'Room not found', 404));
                } else {
                    req.roomData = room;
                    return next();
                }
            });
        }
    });
};

// Get user all rooms
exports.getUserRooms = function(userId, callback) {
    Rooms.find({
        'members': userId
    }).lean().select('').exec(function(err, rooms) {
        return callback(rooms);
    });
};

// // Get room informations
// exports.getRoomInformation = function(req, res) {
//     var room = req.roomData;
//     Rooms.detail(room, req.user._id.toString(), function(data) {
//         return res.jsonp(Utilities.response(true, data));
//     });
// };

// Add users to room
exports.addMembers = function(data, user, callback) {
    var room;
    async.series({
        validateRoomId: function(cb) {
            Utilities.validateObjectId(data.roomId, function(isValid) {
                return cb(!isValid, 'Invalid room id');
            });
        },
        validateMemberIds: function(cb) {
            var notExists = [];
            async.each(data.members, function(id, cb1) {
                Users.checkExistById(id, function(isExist) {
                    if (!isExist) {
                        notExists.push(id);
                    }
                    return cb1(!isExist);
                });
            }, function(err) {
                return cb(err, notExists);
            });
        },
        findRoom: function(cb) {
            Rooms.findOne({
                '_id': data.roomId
            }, function(err, r) {
                if (err) {
                    return cb(true, 'Find room error');
                } else if (!r) {
                    return cb(true, 'Room does not exist');
                } else {
                    room = r;
                    return cb(null);
                }
            });
        },
        addMembersToRoom: function(cb) {
            // If room have 2 members, and isGroup is false, create a new room and add all members to that room
            if ((room.members.length <= 2) && !room.isGroup) {
                var allMembers = Utilities.unionArrays(room.members, data.members);
                var newRoom = new Rooms({
                    '_userId': room._userId,
                    'members': allMembers,
                    'isGroup': true
                });
                newRoom.save(function(err) {
                    if (err) {
                        return cb(true, 'Create new room error');
                    } else {
                        // Get new members informations
                        async.map(data.members, function(id, cb1) {
                            Users.getInformationById(id, user._id, function(u) {
                                return cb1(null, u);
                            });
                        }, function(err, users) {
                            return cb(null, {
                                'roomId': data.roomId,
                                'members': users,
                                'senderId': user._id.toString(),
                                'senderName': user.username.toString()
                            });
                        });
                    }
                });
            }
            // Else update new users to members array
            else {
                room.members = Utilities.unionArrays(room.members, data.members);
                room.save(function(err) {
                    if (err) {
                        return callback(Utilities.response(false, {}, 'Save new members to room error'));
                    } else {
                        // Get new members informations
                        async.map(data.members, function(id, cb1) {
                            Users.getInformationById(id, user._id, function(u) {
                                return cb1(null, u);
                            });
                        }, function(err, users) {
                            return cb(null, {
                                'roomId': data.roomId,
                                'members': users,
                                'senderId': user._id.toString(),
                                'senderName': user.username.toString()
                            });
                        });
                    }
                });
            }
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return callback(Utilities.response(false, {}, results[last]));
        } else {
            return callback(Utilities.response(true, results.addMembersToRoom));
        }
    });
};

// Leave room
exports.leave = function(data, userId, callback) {
    var room;
    async.series({
        validateRoomId: function(cb) {
            Utilities.validateObjectId(data.roomId, function(isValid) {
                return cb(!isValid, 'Invalid room id');
            });
        },
        findRoom: function(cb) {
            Rooms.findOne({
                '_id': data.roomId
            }, function(err, r) {
                if (err) {
                    return cb(true, 'Find room error');
                } else if (!r) {
                    return cb(true, 'Room does not exist');
                } else {
                    room = r;
                    return cb(null);
                }
            });
        },
        leaveRoom: function(cb) {
            // Find user in members array
            var userIndex = Utilities.getIndex(room.members, userId);

            if (userIndex === -1) {
                return cb(true, 'You are not currently in this room');
            } else {
                // Splice out of array
                room.members.splice(userIndex, 1);
            }

            // If room only have remain 1 member, destroy it
            if (room.members.length <= 1) {
                room.remove(function(err) {
                    if (err) {
                        return cb(true, 'Leave room error')
                    } else {
                        return cb(null, true);
                    }
                });
            } else {
                // Save
                room.save(function(err) {
                    if (err) {
                        return cb(true, 'Leave room error')
                    } else {
                        return cb(null, false);
                    }
                });
            }
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return callback(Utilities.response(false, {}, results[last]));
        } else {
            return callback(Utilities.response(true, {
                isDestroy: results.leaveRoom,
                roomId: data.roomId
            }));
        }
    });
};

// Change room title
exports.changeRoomTitle = function(req, res) {
    var room = req.roomData;
    var title = req.body.title ? req.body.title.toString() : '';
    room.update({
        'title': title
    }, function(err) {
        if (err) {
            return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
        } else {
            // Emit event to room members
            global.io.to(room._id).emit('changeRoomTitle', Utilities.response(true, {
                'roomId': room._id,
                'title': title,
                'senderId': req.user._id.toString(),
                'senderName': req.user.username.toString()
            }));
            return res.jsonp(Utilities.response(true));
        }
    });
};

// Get all rooms
exports.getAllRooms = function(req, res) {
    var userId = req.user._id.toString();
    Rooms.find({
        'members': userId,
        'isGroup': true
    }).sort('-updatedAt').select('title isGroup members').populate('members', 'username').lean().exec(function(err, rooms) {
        if (err) {
            return res.jsonp(Utilities.response(false, [], Utilities.getErrorMessage(req, err)));
        } else {
            // ABCXYZ Get room info
            return res.jsonp(Utilities.response(true, rooms));
        }
    });
};
