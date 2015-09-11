var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var async = require('async');

var RoomsSchema = new Schema({
    members: [{
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    }],
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    title: {
        type: String,
        default: ''
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'rooms'
});

// Static functions
RoomsSchema.statics = {
    checkExistById: function(roomId, callback) {
        var that = this;
        Utilities.validateObjectId(roomId, function(isValid) {
            if (!isValid) {
                return callback(false);
            }

            that.findOne({
                '_id': roomId
            }).select('title members isGroup').lean().exec(function(err, room) {
                return callback(room);
            });
        });
    },
    checkExistByUsersInRoom: function(members, callback) {
        this.findOne({
            'members': {
                $all: members,
                $size: members.length
            }
        }).select('title members isGroup').lean().exec(function(err, room) {
            return callback(room);
        });
    },
    detail: function(room, userId, callback) {
        async.parallel({
            isAdmin: function(cb) {
                return cb(null, room._userId.toString() === userId);
            },
            members: function(cb) {
                if (!room.members) {
                    return cb(null, []);
                } else {
                    var Users = mongoose.model('Users');
                    var users = [];
                    async.each(room.members, function(member, cb1) {
                        if (member._id.toString() !== userId) {
                            Users.detail(member, userId, function(u) {
                                users.push(u);
                                return cb1(null);
                            });
                        } else {
                            return cb1(null);
                        }

                    }, function(err) {
                        return cb(null, users);
                    });
                }
            },
            lastMessage: function(cb) {
                mongoose.model('Messages').findOne({
                        '_roomId': room._id
                    }).sort('-createdAt').select('message _userId')
                    .populate('_userId', Config.Populate.User).lean().exec(function(err, message) {
                        if (err || !message) {
                            return cb(null, {});
                        } else {
                            message.createdAt_format = Utilities.formatDate(message.createdAt);
                            return cb(null, Utilities.pickFields(message, ['message', '_userId', '_id', 'createdAt_format']));
                        }
                    });
            },
            unread: function(cb) {
                mongoose.model('UserInRoomStatus').findOne({
                    '_roomId': room._id,
                    '_userId': userId
                }).select('unread').lean().exec(function(err, status) {
                    var unread = 0;
                    if (status) {
                        unread = status.unread;
                    }
                    return cb(null, unread);
                });
            }
        }, function(err, data) {
            return callback(Utilities.extendObject(room, data));
        });
    }
};

// Post-save hook
RoomsSchema.post('save', function(doc) {

});

// Post-remove hook
RoomsSchema.post('remove', function(doc) {
    async.parallel({
        removeUserInRoomStatus: function(cb) {
            mongoose.model('UserInRoomStatus').remove({
                _roomId: doc._id
            }, {
                multi: true
            }).exec();
            return cb();
        }
    });
});

var UserInRoomStatusSchema = new Schema({
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    _roomId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Rooms'
    },
    unread: {
        type: Number,
        default: 0
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'userInRoomStatus'
});

// Export model
module.exports = mongoose.model('Rooms', RoomsSchema);
module.exports = mongoose.model('UserInRoomStatus', UserInRoomStatusSchema);
