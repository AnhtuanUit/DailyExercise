var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var async = require('async');

var validateTitle = function(value, callback) {
    return callback(value && (value.length >= 3));
};


var NewsSchema = new Schema({

    description: String,
    _userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    title: {
        required: true,
        type: String,
        validate: [validateTitle, 'Title must be at least 3 characters']
    },
    thumbnails: {
        required: true,
        type: String
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
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'news'
});

// Static functions
NewsSchema.statics = {
    checkExistById: function(id, callback) {
        var that = this;
        Utilities.validateObjectId(id, function(isValid) {
            if (!isValid) {
                return callback(false);
            }
        });
    },
    getInfoNews: function  (newsId, callback) {
        var that = this;
        mongoose.model('News').findOne({'_id': newsId}, function  (err, news) {
        
            return callback(news);
        });
    }
};

// Post-save hook
NewsSchema.post('save', function(doc) {
console.log(1);
    var Activities = mongoose.model('Activities');
    var activity = new Activities({
        '_userId': doc._userId,
        '_uTargetId': doc._userId,
        '_newsId': doc._id,
        'type': Config.Activities.News.Create
    });
    console.log(activity);
    activity.save(function  (er,a) {
        if(!er)
            console.log(a);
    });

});

// Post-remove hook
NewsSchema.post('remove', function(doc) {

    var Activities = mongoose.model('Activities');
    Activities.find({
        '_userId': doc._userId,
        '_newsId': doc._id
    }, function(err, activities) {
        if (activities && activities.length) {
            for (var i in activities) {
                activities[i].remove();
            }
        }
    });

});


// Export model
module.exports = mongoose.model('News', NewsSchema);
