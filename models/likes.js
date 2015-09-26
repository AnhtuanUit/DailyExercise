var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;
var Config = require('../config/config');
var async = require('async');

var validateContent = function(value, callback) {
    return callback(value && (value.length > 3));
};

var LikeSchema = new Schema({
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

var LikeNewsSchema = LikeSchema.extend({
    _targetId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'News'
    }
}, {
    collection: 'likeNews'
});

var LikeCommentSchema = LikeSchema.extend({
    _targetId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }
}, {
    collection: 'likeComment'
});

LikeSchema.methods = {

};

// Static functions
LikeSchema.statics = {
    checkLike: function(targetId, userId, type, callback) {
        mongoose.model('Like' + type).count({
            '_targetId': targetId,
            '_userId': userId
        }, function(err, c) {
            return callback(!err && !!c);
        });
    },
    removeLikesByNewsId: function(postId, callback) {
        this.find({
            '_postId': postId
        }, function(err, likes) {
            if (err) {
                return callback(err);
            } else if (!likes.length) {
                return callback(null);
            } else {
                // Remove like documents
                async.each(likes, function(like, cb) {
                    like.remove(function() {
                        return cb();
                    });
                }, function() {
                    return callback(null);
                });
            }
        });
    },
    removeLikesByCommentId: function(commentId, callback) {
        this.find({
            '_commentId': commentId
        }, function(err, likes) {
            if (err) {
                return callback(err);
            } else if (!likes.length) {
                return callback(null);
            } else {
                // Remove like documents
                async.each(likes, function(like, cb) {
                    like.remove(function() {
                        return cb();
                    });
                }, function() {
                    return callback(null);
                });
            }
        });
    }
};

// Post-save hook
LikeNewsSchema.post('save', function(doc) {
    // Update informations
    async.parallel({
        updateNewsStatistic: function(cb) {
            mongoose.model('News').update({
                '_id': doc._targetId
            }, {
                $inc: {
                    'statistic.likes': 1
                }
            }).exec();
            return cb();
        }
    });
});

// Post-remove hook
LikeNewsSchema.post('remove', function(doc) {
    // Update informations
    async.parallel({
        updateNewsStatistic: function(cb) {
            mongoose.model('News').update({
                '_id': doc._targetId,
                'statistic.likes': {
                    $gt: 0
                }
            }, {
                $inc: {
                    'statistic.likes': -1
                }
            }).exec();
            return cb();
        }
    });
});

// Post-save hook
LikeCommentSchema.post('save', function(doc) {
    // Update informations
    async.parallel({
        updatePostStatistic: function(cb) {
            mongoose.model('Comments').update({
                '_id': doc._targetId
            }, {
                $inc: {
                    'statistic.likes': 1
                }
            }).exec();
            return cb();
        }
    });
});

// Post-remove hook
LikeCommentSchema.post('remove', function(doc) {
    async.parallel({
        updatePostStatistic: function(cb) {
            mongoose.model('Comments').update({
                '_id': doc._targetId,
                'statistic.likes': {
                    $gt: 0
                }
            }, {
                $inc: {
                    'statistic.likes': -1
                }
            }).exec();
            return cb();
        }
    });
});

// Export model
module.exports = mongoose.model('Like', LikeSchema);
module.exports = mongoose.model('LikeNews', LikeNewsSchema);
module.exports = mongoose.model('LikeComments', LikeCommentSchema);
