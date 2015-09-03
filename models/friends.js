var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FriendSchema = new Schema({
    senderId: {
        type: String,
        required: true,
      
    },
    receiverId: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActivedAt: {
        type: Date,
        default: Date.now
    },
    success:{
        type: Boolean,
        default: false
    }  
}, {
    collection: 'friends'
});

FriendSchema.statics = {
    getUserId: function(friend, userId, callback) {
        if(userId == friend.senderId)
        {
            var data = {_id : friend.receiverId};
            return callback(data);
        } else {
            var data = {_id : friend.senderId};
            return callback(data);
        }
    }
};

// Export model
module.exports = mongoose.model('Friend', FriendSchema);
