var mongoose = require('mongoose');
var Users = mongoose.model('Users');
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var jwt = require('jsonwebtoken');
var async = require('async');

exports.queryUser = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid user id', 404));
        } else {
            Users.findOne({
                '_id': id
            }).exec(function(err, user) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!user) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'User not found', 404));
                } else {
                    req.userData = user;
                    return next();
                }
            });
        }
    });
};

exports.queryLeanUser = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid user id', 404));
        } else {
            var populateFields = (req.user._id === id) ? Config.Populate.UserFull : Config.Populate.User;
            Users.findOne({
                '_id': id,
                'status': Config.User.Status.Active
            }).lean().select(populateFields).exec(function(err, user) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!user) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'User not found', 404));
                } else {
                    req.userData = user;
                    return next();
                }
            });
        }
    });
};
// Register an account
exports.signup = function(req, res) {
    var user;
    async.series({
        createUserObject: function(cb) {
            user = new Users(req.body);
            return cb(null);
        },
        formatPhoneNumber: function(cb) {
            // ABCXYZ
            if (user.phone) {
                user.displayname = user.phone.trim();
            }
            return cb(null);
        },
        save: function(cb) {
            user.save(function(err) {
                if (err) {
                    return cb(true, Utilities.getErrorMessage(req, err));
                } else {
                    return cb(null);
                }
            });
        },
        token: function(cb) {
            var profile = {
                _id: user._id,
                username: user.username,
                avatar: user.avatar,
                gender: user.gender,
                role: user.role
            };
            // Create token
            token = jwt.sign(profile, Config.JWTSecret);
            return cb(null, token);
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
           // console.log(results);
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, {
                '_id': user._id,
                'token': results.token
            }));
        }
    });
};

// Change password
exports.changePassword = function(req, res) {
    var oldPassword = req.body.oldPassword ? req.body.oldPassword.toString() : '';
    var newPassword = req.body.newPassword ? req.body.newPassword.toString() : '';

    var user = req.userData;
    console.log(user);
    // Check old password, if not correct, return
    if (!user.checkLogin(oldPassword)) {
        return res.jsonp(Utilities.response(false, {}, 'Old password was not correct'));
    } else {
        // Generate new password hash
        var newHashedPassword = user.hashPassword(newPassword, user.salt);
        user.update({
            'hashed_password': newHashedPassword
        }, function(err) {
            if (err) {
                return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
            } else {
                return res.jsonp(Utilities.response(true, {}, 'Change password successfully'));
            }
        });
    }
};

// Change avatar
exports.changeAvatar = function(req, res) {
    // Return if no file
    if (!req.files.file) {
        return res.jsonp(Utilities.response(false, {}, 'No file to upload'));
    } else {
        var newName;
        async.series({
            uploadAvatar: function(cb) {
                Files.upload(req.files.file, function(err, msg) {
                    newName = msg;
                    return cb(err, msg);
                });
            },
            updateUser: function(cb) {
                var oldAvatar = req.user.avatar;
                req.user.avatar = newName;
                req.user.save(function(err) {
                    if (err) {
                        return cb(true, Utilities.getErrorMessage(req, err));
                    } else {
                        // If have old avatar, remove it on S3
                        if (oldAvatar) {
                            Utilities.removeFileFromS3(oldAvatar, Config.Messages.Types.Image);
                        }
                        return cb(null);
                    }
                });
            },
            createActivity: function(cb) {
                // Create activity
                var activity = new Activities({
                    '_userId': req.user._id,
                    'type': Config.Activities.Users.ChangeAvatar
                });
                activity.save();
                return cb(null);
            }
        }, function(err, results) {
            if (err) {
                var keys = Object.keys(results);
                var last = keys[keys.length - 1];
                return res.jsonp(Utilities.response(false, [], results[last]));
            } else {
                return res.jsonp(Utilities.response(true, {
                    'avatar': newName
                }));
            }
        });
    }
};

// Get user by id
exports.getUserById = function(req, res) {
    var userId = req.user ? req.user._id.toString() : '';
    Users.getFullInformations(req.userData, userId, function(data) {
        return res.jsonp(Utilities.response(true, data));
    });
};

// Do login
exports.login = function(req, res) {
    var username = req.body.username ? req.body.username.toString() : '';
    var password = req.body.password ? req.body.password.toString() : '';
    // Trim username (email/phone)
    username = username.trim();

    var user;
    // Do functions in series
    async.series({
        findUser: function(cb) {
            async.parallel({
                findByEmail: function(cb1) {
                    Users.findOne({
                            'username': username
                        })
                        .select('-accType -socialProfile')
                        .exec(function(err, u) {
                            if (u) {
                                user = u;
                            }
                            return cb1();
                        });
                }
            }, function() {
                return cb(!user, 'Incorrect username or password');
            });
        },
        checkPassword: function(cb) {
            return cb(!user.checkLogin(password), 'Incorrect username or password');
        },
        getUserInformations: function(cb) {
            Users.getFullInformations(user, null, function(data) {
                user = data;
                console.log(data);
                return cb(null);
            });
        },
        createToken: function(cb) {
            var profile = {
                _id: user._id,
                username: user.username,
                avatar: user.avatar,
                gender: user.gender
            };
            // Create token
            var token = jwt.sign(profile, Config.JWTSecret);
            user.token = token;
            return cb(null);
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, user));
        }
    });
};

exports.logout = function(req, res) {
    return res.jsonp(Utilities.response(true));
};


exports.getAllFriends = function(req, res) {
    Users.find(function(err, users) {
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
};

