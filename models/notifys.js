var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Config = require('../config/config');

var NotifySchema = new Schema({
    senderId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    userId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    notifyAt: {
        type: Date,
        default: Date.now
    },
    type: {
        type: Number,
        required: true    
    },
    remove: {
        type: Boolean,
        default: false
    }
}, {
    collection: 'notifys'
});

NotifySchema.statics = {
    getNotify: function  (type, callback) {
        if(type == Config.Notify.type.addFriend){
            return callback ("đã gửi cho bạn yêu cầu kết bạn.");
        }
        if(type == Config.Notify.type.acceptFriend){
            return callback ('đã đồng ý yêu cầu kết bạn của bạn.');
        }
    },

    detail: function(notify, user, callback) {
        this.getNotify(notify.type, function  (data) {
            return callback({
                'sender': user,
                'notify': data
            });
        });

    }
};

// Export model
module.exports = mongoose.model('Notifys', NotifySchema);
