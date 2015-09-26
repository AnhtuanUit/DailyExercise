var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Config = require('../config/config');
var async = require('async');

var ActivitySchema = new Schema({
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    _uTargetId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    type: Number,
    _newsId: {
        type: Schema.Types.ObjectId,
        ref: 'News'
    },
    _friendId: {
        type: Schema.Types.ObjectId,
        ref: 'Friends'
    },
    status: {
        type: Boolean,
        default: true
    }
}, {
    collection: 'activities'
});

ActivitySchema.statics = {
    detail: function(activity, userId, callback) {
        var Users = mongoose.model('Users');
        var type = activity.type;
        console.log(type);
        // News
        if ((type >= 100) && (type < 200)) {
            if (!activity || !activity._newsId) {
                return callback(null);
            }
            mongoose.model('News').getInfoNews(activity._newsId, function(data) {
                
             
                Users.detail(userId, null, function  (data1) {
                activity._newsId = data;
                activity._userId = data1;
                return callback(activity);
            });
            });
        }
        // AddFriend
        else if ((type >= 200) && (type < 300)) {
            if (!activity || !activity._friendId) {
                return callback(null);
            }
console.log(userId);
            mongoose.model('Friends').detail(activity._friendId, userId, function(data) {

               Users.detail(userId, null, function  (data1) {
                activity._friendId = data;
                activity._userId = data1;
                return callback(activity);
            });

           });

        }
        // AcceptFriend
        else if ((type >= 300) && (type < 400)) {
            if (!activity || !activity._friendId) {
                return callback(null);
            }
            mongoose.model('Friends').detail(activity._friendId, userId, function(data) {

               Users.detail(userId, null, function  (data1) {
                activity._friendId = data;
                activity._userId = data1;
                return callback(activity);
            });

           });
            
        }
        else {
            return callback(null);
        }
    }
};

// Post-save hook
ActivitySchema.post('save', function(doc) {

});

// Post-remove hook
ActivitySchema.post('remove', function(doc) {

});

// Export model
module.exports = mongoose.model('Activities', ActivitySchema);
