var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Crypto = require('crypto');
var Utilities = require('../config/utilities');
var Config = require('../config/config');
var async = require('async');
var sanitizer = require('sanitizer');

var validateUsername = function(value, callback) {
    return callback(value && (value.length >= 3) && (value.length <= 32));
};

var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var validateUniqueEmail = function(value, callback) {
    mongoose.model('Users').find({
        'email': value
    }, function(err, users) {
        return callback(err || (users.length === 0));
    });
};

var validatePassword = function(value, callback) {
    return callback(value && value.length);
};

var UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        validate: [validateUsername, 'Username must be 3 - 32 characters'],
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [emailRegex, 'Please enter a valid email'],
        validate: [validateUniqueEmail, 'E-mail address is already in-use']
    },
    hashed_password: {
        type: String,
        required: true,
        validate: [validatePassword, 'Password cannot be blank']
    },
    salt: String,
    phone: String,
    avatar: String,
    address: String,
    addressComponents: {},
    city: {},
    country: {},
    desc: String,
    latitude: Number,
    longitude: Number,
    status: {
        type: Number,
        default: Config.User.Status.Active
    },
    access: Number,
    accType: {
        type: Number,
        default: Config.User.Types.Local
    },
    socialProfile: {},
    isPublicSeen: {
        type: Boolean,
        default: true
    },
    gender: { // 1: Male, 2: Female
        type: Number,
        default: 1
    },
    role: { // 1: Admin, 2: User, 3: ...
        type: Number,
        default: Config.User.Role.User
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActivedAt: {
        type: Date,
        default: Date.now
    },
    statistic: {
        'followers': {
            type: Number,
            default: 0
        },
        'followings': {
            type: Number,
            default: 0
        },
        'joiningEvent': {
            type: Number,
            default: 0
        }
    },
    isOnline: {
        type: Boolean,
        default: true
    }
}, {
    collection: 'users'
});

UserSchema.virtual('password').set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.hashPassword(password, this.salt);
}).get(function() {
    return this._password;
});

// Encrypt password
function encrypt(password, salt) {
    var saltHash = new Buffer(salt, 'base64');
    return Crypto.pbkdf2Sync(password, saltHash, 10000, 64).toString('base64');
}

// Document methods
UserSchema.methods = {
    makeSalt: function() {
        return Crypto.randomBytes(16).toString('base64');
    },
    hashPassword: function(password, salt) {
        if (!password || !salt) {
            return '';
        }
        return encrypt(password, salt);
    },
    checkLogin: function(password) {
        return (encrypt(password, this.salt) === this.hashed_password);
    },
    xss: function(data) {
        var that = this;
        var fields = ['username', 'phone', 'country', 'email'];
        for (var i in fields) {
            that[fields[i]] = sanitizer.sanitize(that[fields[i]]);
        }
    }
};

// Model static functions
UserSchema.statics = {
    checkExistById: function(id, callback) {
        var that = this;
        Utilities.validateObjectId(id, function(isValid) {
            if (!isValid) {
                return callback(false);
            }

            that.count({
                '_id': id,
                'status': Config.User.Status.Active
            }, function(err, c) {
                return callback(!err && c);
            });
        });
    },
    avatar: function(user, callback) {
        if (user && user.avatar) {
            return callback(Config.Env[process.env.NODE_ENV].Image + user.avatar);
        } else {
            if (user && user.gender === 1) {
                return callback(Config.Env[process.env.NODE_ENV].Image + 'male.png');
            } else {
                return callback(Config.Env[process.env.NODE_ENV].Image + 'female.png');
            }
        }
    },
    getFullInformations: function(user, userId, callback) {
        console.log(user._id);
        console.log(userId);
      

        var that = this;
        async.parallel({
            avatar: function(cb) {
                that.avatar(user, function(avatar) {
                    return cb(null, avatar);
                });
            },
            isFollowBack: function(cb) {
                if (!userId || (userId === user._id)) {
                    return cb(null, false);
                } else {
                    mongoose.model('Follow').isFollow(user._id, userId, function(isFollow) {
                        return cb(null, isFollow);
                    });
                }
            }
        }, function(err, data) {
            // Remove fields

            var removeFields = ['hashed_password', 'salt'];
            if (user._id !== userId) {
                removeFields.push('email');
                if (!data.isFollowBack || !data.isFollow) {
                    removeFields.push('phone');
                }
            }
            for (var i in removeFields) {
                user[removeFields[i]] = undefined;
                delete user[removeFields[i]];
            }
            console.log(data);
            data.isFollowBack = undefined;
            delete data.isFollowBack;
            return callback(Utilities.extendObject(user.toObject(), data));
        });
    },
    detail: function(user, userId, callback) {
        var that = this;
        async.parallel({
            avatar: function(cb) {
                that.avatar(user, function(avatar) {
                    return cb(null, avatar);
                });
            },
            isFollow: function(cb) {
                if (!userId || (userId === user._id)) {
                    return cb(null, false);
                } else {
                    mongoose.model('Follow').isFollow(userId, user._id, function(isFollow) {
                        return cb(null, isFollow);
                    });
                }
            }
        }, function(err, data) {
            // Pick fields
            var userInfo = Utilities.pickFields(user, ['_id', 'username', 'avatar', 'isOnline']);
            return callback(Utilities.extendObject(userInfo, data));
        });
    },
    getInformationById: function(targetId, userId, callback) {
        var that = this;
        that.findOne({
            '_id': targetId
        }).select(Config.Populate.User).lean().exec(function(err, u) {
            if (err || !u) {
                return callback({});
            } else {
                that.detail(u, userId, function(user) {
                    return callback(user);
                });
            }
        });
    }
};

// Pre-save hook
UserSchema.pre('save', function(next) {
    if (this.isNew) {
        this._isNew = true;
    }
    next();
});

// Post-save hook
UserSchema.post('save', function(user) {
    // If create new
    if (user._isNew) {
        // Do some actions
        async.parallel({
            follow: function(cb) {
                // ABCXYZ Find famous or populate users to follow
                mongoose.model('Users').find({
                    '_id': {
                        $ne: user._id.toString()
                    }
                }).limit(40).select('').lean().exec(function(err, users) {
                    if (err || !users || !users.length) {
                        return cb();
                    } else {
                        var Follow = mongoose.model('Follow');
                        async.each(users, function(u, cb1) {
                            var follow = new Follow({
                                '_userId': user._id.toString(),
                                '_followId': u._id.toString()
                            });
                            follow.save();
                            return cb1();
                        }, function() {
                            return cb();
                        });
                    }
                });
            }
        });
    }
    // If update informations
    else {
        console.log('Updated user ' + user._id);
    }
});

// Post-remove hook
UserSchema.post('remove', function(user) {
    console.log('Removed user ' + user._id);
});

/* ********************** USER DEVICE ******************************* */
var UserDevicesSchema = new Schema({
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    status: {
        type: Number,
        default: Config.UserDevices.Status.Online
    },
    deviceId: String,
    informations: {
        ip: String,
        osVersion: String,
        osType: String
    },
    type: {
        type: Number,
        default: Config.UserDevices.Types.PC
    },
    lastActivedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'userDevices'
});

// Export model
module.exports = mongoose.model('Users', UserSchema);
module.exports = mongoose.model('UserDevices', UserDevicesSchema);
