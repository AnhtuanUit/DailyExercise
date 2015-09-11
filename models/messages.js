var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var async = require('async');

var MessageSchema = new Schema({
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
    type: {
        type: Number,
        default: Config.Messages.Types.Text
    },
    message: String,
    modifiedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'messages'
});

// Static functions
MessageSchema.statics = {
    detail: function(message, callback) {
        async.parallel({
            // createdAt: function(cb) {
            //     return cb(null, Utilities.formatDate(message.createdAt));
            // },
            // modifiedAt: function(cb) {
            //     if (!message.modifiedAt) {
            //         return cb(null, '');
            //     } else {
            //         return cb(null, Utilities.formatDate(message.modifiedAt));
            //     }
            // },
            _userId: function(cb) {
                mongoose.model('Users').detail(message._userId, null, function(user) {
                    return cb(null, user);
                });
            },
            file: function(cb) {
                if (message.type === Config.Messages.Types.Text) {
                    return cb(null, {});
                } else {
                    mongoose.model('Files').findOne({
                        '_id': message.message.toString()
                    }).select(Config.Populate.File).lean().exec(function(err, file) {
                        if (err || !file) {
                            return cb(null, {});
                        } else {
                            // If image, get thumbnail url
                            if (file.type === Config.Messages.Types.Image) {
                                // Request signed url for thumbnail
                                Utilities.getFileUrl('thumbnail_' + file.name, function(url) {
                                    file.thumbnail = url;
                                    return cb(null, file);
                                });
                            } else {
                                return cb(null, file);
                            }
                        }
                    });
                }
            }
        }, function(err, data) {
            return callback(Utilities.extendObject(message, data));
        });
    }
};

// Post-save hook
MessageSchema.post('save', function(doc) {
    mongoose.model('Rooms').update({
        '_id': doc._roomId.toString()
    }, {
        $set: {
            'updatedAt': Date.now()
        }
    }).exec();
});

// Post-remove hook
MessageSchema.post('remove', function(doc) {

});


// Export model
module.exports = mongoose.model('Messages', MessageSchema);
