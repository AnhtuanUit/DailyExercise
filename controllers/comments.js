var mongoose = require('mongoose');
var CommentNews = mongoose.model('CommentNews');
var Utilities = require('../config/utilities');
var Config = require('../config/config');
var async = require('async');

// Middleware
exports.queryComment = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.jsonp(Utilities.response(false, {}, 'Invalid comment id', 404));
        } else {
            var type = req.body.type ? req.body.type.toString() : 'News';
            console.log('Comment' + type);
            mongoose.model('Comment' + type).findOne({
                '_id': id
            })
            .populate('_userId', Config.Populate.User)
            .exec(function(err, comment) {
                if (err || !comment) {
                    return res.jsonp(Utilities.response(false, {}, 'Comment not found', 404));
                } else {
                    req.commentData = comment;
                    console.log(comment);
                    return next();
                }
            });
        }
    });
};

// Get comments of post
exports.getComments = function(req, res) {
    var newsId = req.params.newsId ? req.params.newsId.toString() : '';
    var timestamp = req.query.timestamp ? parseFloat(req.query.timestamp) : Date.now();
    var userId = req.user._id.toString();

    // Do functions in a series
    async.series({

        // Get sub comments
        getComments: function(cb) {
            CommentNews.getCommentsByNewsId(newsId, userId, timestamp, function(comments) {
                return cb(null, comments);
            });
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, results.getComments));
        }
    });
};



// Comment on a post
exports.createComment = function(req, res) {
    var newsId = req.params.newsId ? req.params.newsId.toString() : '';
    var userId = req.user._id.toString();

    // Do functions in a series
    async.series({
        // Create comment
        createComment: function(callback) {
            // Create comment object
            var comment = new CommentNews(req.body);
            comment._userId = userId;
            comment._newsId = newsId;

            comment.save(function(err) {
                if (err) {
                    return callback(true, Utilities.getErrorMessage(req, err));
                } else {
                    return callback(null, comment._id);
                }
            });
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, {
                'commentId': results.createComment
            }));
        }
    });
};



// Delete comment
exports.deleteCommentById = function(req, res) {
    var comment = req.commentData;

    // Delete comment
    comment.removeFromDb(function(err) {
        if (err) {
            return res.jsonp(Utilities.response(false, {}, 'Server error'));
        } else {
            return res.jsonp(Utilities.response(true));
        }
    });
};
