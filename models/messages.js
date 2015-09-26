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
    _targetId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
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

    detail: function(sender, response, callback) {
        mongoose.model('Users').findOne({'_id': sender._id}, function  (err, result) {
            return callback({
                user: result,
                message: {
                 message: response.message,
                 createdAt: response.createdAt,
                 type: response.type
             }
         });

        });
        
    }
};

// Export model
module.exports = mongoose.model('Messages', MessageSchema);
