var mongoose = require('mongoose');
var Messages = mongoose.model('Messages');
var Rooms = mongoose.model('Rooms');
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var store = require('redis').createClient();
var async = require('async');

// Middleware
exports.queryLeanMessage = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.jsonp(Utilities.response(false, {}, 'Invalid message id'));
        } else {
            Messages.findOne({
                '_id': id
            }).lean().populate('_roomId', 'title members').exec(function(err, message) {
                if (err) {
                    return res.status(500).jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err), 500));
                } else if (!message) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'Message not found', 404));
                } else {
                    req.messageData = message;
                    return next();
                }
            });
        }
    });
};

// Get room recent messages by room id
exports.getRoomMessagesByRoomId = function(req, res) {
    var roomId = req.params.roomId ? req.params.roomId.toString() : '';
    var timeStamp = req.query.timestamp ? parseFloat(req.query.timestamp) : Date.now();

    async.series({
        validateRoomId: function(cb) {
            // Validate room id
            Utilities.validateObjectId(roomId, function(isValid) {
                return cb(!isValid, 'Invalid room id');
            });
        },
        getRoomMessages: function(cb) {
            getRoomMessages(res, timeStamp, roomId);
            return cb(null);
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, [], results[last]));
        }
    });
};

// Get room messages by members ids
exports.getRoomMessagesByUserId = function(req, res) {
    var targetId = req.params.targetId ? req.params.targetId.toString() : '';
    var userId = req.user._id.toString();
    var timeStamp = req.query.timestamp ? parseFloat(req.query.timestamp) : Date.now();
    var isGroup = req.query.isGroup ? !!req.query.isGroup : false;
    var roomId = '';
    var usersArray = [targetId, userId];

    async.series({
        validateUserId: function(cb) {
            // Validate id
            Utilities.validateObjectId(targetId, function(isValid) {
                return cb(!isValid, 'Invalid user id');
            });
        },
        getRoomId: function(cb) {
            // Get room id
            Rooms.findOne({
                $or: [{
                    'members': usersArray
                }, {
                    'members': usersArray.reverse()
                }],
                isGroup: isGroup
            }).lean().exec(function(err, room) {
                if (room) {
                    roomId = room._id.toString();
                    return cb(null);
                } else if (err) {
                    return cb(true, Utilities.getErrorMessage(req, err));
                } else {
                    return cb(null);
                }
            });
        },
        getRoomMessages: function(cb) {
            getRoomMessages(res, timeStamp, roomId);
            return cb(null);
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, [], results[last]));
        }
    });
};

var getRoomMessages = function(res, timeStamp, roomId) {
    // If have no room, return empty data
    if (!roomId) {
        return res.jsonp(Utilities.response(true, []));
    }
    var date = new Date(timeStamp);
    Messages.find({
            '_roomId': roomId,
            'createdAt': {
                $lt: date
            }
        })
        .sort('-createdAt')
        .limit(Config.GetPerQuery.Messages)
        .populate('_userId', Config.Populate.User)
        .lean().exec(function(err, messages) {
            if (err) {
                return res.jsonp(Utilities.response(false, [], Utilities.getErrorMessage(req, err)));
            } else if (!messages.length) {
                return res.jsonp(Utilities.response(true, []));
            } else {
                // Get message detail
                async.map(messages, function(message, cb) {
                    Messages.detail(message, function(m) {
                        return cb(null, m);
                    });
                }, function(err, data) {
                    return res.jsonp(Utilities.response(true, data));
                });
            }
        });
};

// Get message attached file signed url on S3
exports.getMessageFileUrlById = function(req, res) {
    var message = req.messageData;
    var userId = req.user._id.toString();
    var file;
    async.series({
        checkUserInRoom: function(cb) {
            return cb(Utilities.getIndex(message._roomId.members, userId) === -1, 'Access denied');
        },
        getFileUrl: function(cb) {
            // Request signed url for file
            Utilities.getFileUrl(file.name, function(url) {
                file.thumbnail = url;
                return cb(!url, 'File not found');
            });
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, file));
        }
    });
};

// Chat with other users
exports.chat = function(data, sender, callback) {
    // Get params
    var members = data.members ? data.members : [];
    var message = data.message;
    var roomId = data.roomId;
    var type = data.type ? parseInt(data.type) : 1;

    // Valid data
    if (!Array.isArray(members)) {
        members = [];
    }
    if ((type < 1) || (type > 3)) {
        type = 1;
    }

    // If no room info, return
    if (!roomId && !members.length) {
        return callback(Utilities.response(false, {}, 'No room data'));
    }
    // If have roomId, check room exist and check sender is in that room or not
    else if (roomId) {
        saveMessageInExistRoomId({
            roomId: roomId,
            message: message,
            sender: sender,
            type: type
        }, function(data) {
            return callback(data);
        });
    }
    // Else check room existed or not
    else {
        Rooms.checkExistByUsersInRoom(members, function(r) {
            if (!r) {
                createRoomThenSaveMessage({
                    members: members,
                    message: message,
                    sender: sender,
                    type: type
                }, function(data) {
                    return callback(data);
                });
            } else {
                saveMessageToRoom({
                    room: r,
                    message: message,
                    sender: sender,
                    type: type
                }, function(data) {
                    return callback(data);
                });
            }
        });
    }
};

function saveChatMessage(data, callback) {
    var msg = new Messages({
        '_roomId': data.roomId,
        'message': data.message,
        '_userId': data.userId,
        'type': data.type
    });

    async.series({
        saveMessage: function(cb) {
            msg.save(function(err) {
                if (err) {
                    return cb(true, 'Save message error');
                } else {
                    return cb(null);
                }
            });
        },
        getMessageFileUrl: function(cb) {
            // If text, return
            if (msg.type === Config.Messages.Types.Text) {
                return cb(null, {
                    _id: msg._id.toString(),
                    createdAt: msg.createdAt,
                    file: {},
                    type: msg.type,
                    message: msg.message
                });
            }
            // Else get file info in database
         
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return callback(false, results[last]);
        } else {
            return callback(true, results.getMessageFileUrl);
        }
    });
}

function generateChatResponse(success, response, data, callback) {
    if (!success) {
        return callback(Utilities.response(false, {}, response));
    } else {
        return callback(Utilities.response(true, {
            room: {
                _id: data.room._id,
                title: data.room.title,
                isNewRoom: data.room.isNewRoom,
                isGroup: data.room.isGroup,
                members: data.room.members
            },
            sender: {
                _id: data.sender._id,
                username: data.sender.username,
                avatar: data.sender.avatar
            },
            message: response
        }));
    }
}

function saveMessageInExistRoomId(data, callback) {
    var room;
    async.series({
        checkRoomExists: function(cb) {
            Rooms.checkExistById(data.roomId, function(r) {
                room = r;
                return cb(!r, 'Room does not exist');
            });
        },
        checkUserInRoom: function(cb) {
            return cb(Utilities.getIndex(room.members, data.sender._id) === -1, 'Access denied');
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return callback(Utilities.response(false, {}, results[last]));
        } else {
            var chatValue = {
                roomId: room._id,
                message: data.message,
                userId: data.sender._id,
                type: data.type
            };
            // Save chat message
            saveChatMessage(chatValue, function(success, response) {
                // Prepare data for response
                var result = {};

                if (success) {
                    room.isNewRoom = false;
                    result = {
                        room: room,
                        sender: data.sender
                    };
                }
                generateChatResponse(success, response, result, callback);
            });
        }
    });
}

function createRoomThenSaveMessage(data, callback) {
    var room;
    async.series({
        createRoom: function(cb) {
            var roomOptions = {
                'members': data.members,
                '_userId': data.sender._id
            };
            if (data.members.length > 2) {
                roomOptions.isGroup = true;
            }
            room = new Rooms(roomOptions);
            return cb(null);
        },
        saveRoom: function(cb) {
            room.save(function(err) {
                if (err) {
                    return cb(true, 'Save room error');
                } else {
                    return cb(null);
                }
            });
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return callback(Utilities.response(false, {}, results[last]));
        } else {
            var chatValue = {
                roomId: room._id,
                message: data.message,
                userId: data.sender._id,
                type: data.type
            };
            // Save
            saveChatMessage(chatValue, function(success, response) {
                // Prepare data for response
                var result = {};
                if (success) {
                    room.isNewRoom = true;
                    result = {
                        room: room,
                        sender: data.sender
                    };
                }
                generateChatResponse(success, response, result, callback);
            });
        }
    });
}

function saveMessageToRoom(data, callback) {
    // Check user is in room or not, if not return
    if (Utilities.getIndex(data.room.members, data.sender._id) === -1) {
        return callback(Utilities.response(false, {}, 'You do not have permission to chat in this room'));
    } else {
        var chatValue = {
            roomId: data.room._id,
            message: data.message,
            userId: data.sender._id,
            type: data.type
        };
        // Save
        saveChatMessage(chatValue, function(success, response) {
            // Prepare data for response
            var result = {};

            if (success) {
                data.room.isNewRoom = false;
                result = {
                    room: data.room,
                    sender: data.sender
                };
            }
            generateChatResponse(success, response, result, callback);
        });
    }
}
