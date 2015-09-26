var mongoose = require('mongoose');
var LikeNews = mongoose.model('LikeNews');
var LikeCommentPost = mongoose.model('LikeComments');
var Utilities = require('../config/utilities');
var async = require('async');

// Like an object
exports.like = function(req, res) {
    var targetId = req.params.targetId ? req.params.targetId.toString() : '';
    var targetType = req.body.type ? req.body.type.toString() : '';
    var userId = req.user._id.toString();

    // Get collection
    var Collection;
    var LikeCollection;
    try {

        Collection = mongoose.model(targetType);
        if (targetType.indexOf('Comment') !== -1) {
            LikeCollection = mongoose.model('LikeComments');
        } else {
            LikeCollection = mongoose.model('Like' + targetType);
        }
    } catch (er) {
        return res.jsonp(Utilities.response(false, {}, 'Invalid type'));
    }
    var likeDoc = null;

    console.log('targetId ' + targetId);
    console.log('targetType ' + targetType);

    // Do functions in a series
    async.series({
        // Check that user is liked this post or not
        checkUserLikePost: function(callback) {
            LikeCollection.findOne({
                '_targetId': targetId,
                '_userId': userId
            }, function(err, like) {
                if (err) {
                    return callback(true, Utilities.getErrorMessage(req, err));
                } else {
                    likeDoc = like;
                    return callback(null, null);
                }
            });
        },
        // Do like
        doLike: function(callback) {
            // If had like document in database, do unlike
            if (likeDoc) {
                likeDoc.remove(function(err) {
                    if (err) {
                        return callback(true, Utilities.getErrorMessage(req, err));
                    } else {
                        return callback(null, false);
                    }
                });
            }
            // Else create like document
            else {
                // Create comment object
                var like = new LikeCollection({
                    '_userId': userId,
                    '_targetId': targetId
                });

                // Save
                like.save(function(err) {
                    if (err) {
                        return callback(true, Utilities.getErrorMessage(req, err));
                    } else {
                        return callback(null, true);
                    }
                });
            }
        }
    }, function(err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, {
                'isLike': results.doLike
            }));
        }
    });
};
