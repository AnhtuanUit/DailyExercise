var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;
var Utilities = require('../config/utilities');
var Config = require('../config/config');
var async = require('async');
var sanitizer = require('sanitizer');

var validateContent = function(value, callback) {
    return callback(value && (value.length > 3));
};

var CommentSchema = new Schema({
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    content: {
        type: String,
        required: true,
        validate: [validateContent, 'Content is require']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    statistic: {
        likes: {
            type: Number,
            default: 0
        },
        comments: {
            type: Number,
            default: 0
        }
    },
    isEdited: {
        type: Boolean,
        default: false
    }
});

// Comment post
var CommentNews = CommentSchema.extend({
    _newsId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'News'
    }
}, {
    collection: 'commentNews'
});


// Methods
CommentSchema.methods = {
    xss: function(callback) {
        var that = this;
        var fields = ['content'];
        for (var i in fields) {
            that[fields[i]] = sanitizer.sanitize(that[fields[i]]);
        }
        return callback();
    }
};

// Methods
CommentNews.methods = Utilities.extendObject(CommentSchema.methods, {
    removeFromDb: function(callback) {
        var that = this;
        // Delete comment childs
        async.series({
  
        }, function(err) {
            that.remove();
            return callback(err);
        });
    }
});


// Static functions
CommentSchema.statics = {
    checkExistById: function(id, callback) {
        var that = this;
        Utilities.validateObjectId(id, function(isValid) {
            if (!isValid) {
                return callback(false);
            }

            that.count({
                '_id': id
            }, function(err, c) {
                return callback(!err && c);
            });
        });
    },
    detail: function(comment, userId, callback) {
        async.parallel({
            _userId: function(cb) {
                mongoose.model('Users').detail(comment._userId, null, function(user) {
                    return cb(null, user);
                });
            },
            isLike: function(cb) {
                mongoose.model('Like').checkLike(comment._id, userId, Config.Likes.Types.Comments, function(isLike) {
                    return cb(null, isLike);
                });
            },
            isAuthor: function(cb) {
                return cb(null, comment._userId._id === userId);
            }
        }, function(err, results) {
            var data = Utilities.pickFields(comment, ['_id', '_userId', 'content', 'statistic', 'updatedAt', 'createdAt', 'isEdited']);
            return callback(Utilities.extendObject(data, results));
        });
    }
};

// CommentPost static functions
CommentNews.statics = Utilities.extendObject(CommentSchema.statics, {
    getCommentsByNewsId: function(newsId, userId, timestamp, callback) {
        var that = this;
        that.find({
                '_newsId': newsId,
                'createdAt': {
                    $lt: timestamp
                }
            }).sort('-createdAt').limit(Config.Pagination.SubCommentPerComment)
            .populate('_userId', Config.Populate.User)
            .lean().exec(function(err, comments) {
                if (err || !comments.length) {
                    return callback([]);
                } else {
                    // Get comment detail
                    async.map(comments, function(comment, cb) {
                        that.detail(comment, userId, function(data) {
                            return cb(null, data);
                        });
                    }, function(err, results) {
                        return callback(results);
                    });
                }
            });
    },
    removeCommentsByNewsId: function(newsId, callback) {
        // Find comments of post
        this.find({
            '_newsId': newsId
        }, function(err, comments) {
            if (err) {
                return callback(err);
            } else if (!comments.length) {
                return callback(null);
            } else {
                // Remove comments
                async.each(comments, function(comment, cb) {
                    comment.removeFromDb(function(e) {
                        return cb(e);
                    });
                }, function(err) {
                    return callback(err);
                });
            }
        });
    }
});



// Pre-save hook
CommentNews.pre('save', function(next) {
    if (this.isNew) {
        this._isNew = true;
    }
    next();
});

// Post-save hook
CommentNews.post('save', function(doc) {
    // Update informations
    async.parallel({
        updatePostStatistic: function(cb) {
            mongoose.model('News').update({
                '_id': doc._newsId
            }, {
                $inc: {
                    'statistic.comments': 1
                }
            }).exec();
            return cb();
        }
    });
});

// Post-remove hook
CommentNews.post('remove', function(doc) {
    async.parallel({
        updatePostStatistic: function(cb) {
            mongoose.model('News').update({
                '_id': doc._newsId,
                'statistic.comments': {
                    $gt: 0
                }
            }, {
                $inc: {
                    'statistic.comments': -1
                }
            }).exec();
            return cb();
        }
    });
});


// Export model
module.exports = mongoose.model('Comments', CommentSchema);
module.exports = mongoose.model('CommentNews', CommentNews);