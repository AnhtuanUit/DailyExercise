var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Config = require('../config/config');
var async = require('async');
var Utilities = require('../config/utilities');

var FriendSchema = new Schema({
    senderId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    receiverId: {
        required: true,
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    addFriendAt: {
        type: Date,
        default: Date.now
    },
    acceptAt: {
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
    },
    checkFriend: function  (friend, callback) {
        var senderId = friend.senderId;
        var receiverId = friend.receiverId;
        console.log( senderId + " "+ receiverId);
        this.findOne(

        {
            senderId: senderId,
            receiverId: receiverId
        }, function  (err, friend) {
            callback(friend);
        });
    },
    detail: function  (friendId, userId, callback) {

        mongoose.model('Friends').findOne({'_id': friendId}, function  (err, friend) {
            if (friend) {
                var friendInfo = Utilities.pickFields(friend, ['_id', 'senderId', 'receiverId', 'success']);
                return callback(friendInfo);
            } else{
                return callback(null);
            };
            
        });
    },
    detailForSocket: function  (friend, user, callback ) {

        mongoose.model('Users').detail(user, null, function  (data) {
            var friendInfo = {
                '_userId': data,
                '_friendId': friend
            }
            return callback(friendInfo);
        });

        
    }
};

FriendSchema.post('save', function(doc) {
    var Activities = mongoose.model('Activities');
    var activity = new Activities({
        '_userId': doc.senderId,
        '_uTargetId': doc.senderId,

        '_friendId': doc._id,
        'type': Config.Activities.AddFriend.Create
    });

    activity.save(function  (err, act) {
        if (!err){
            console.log('saved Activity');
        }
    });
    var activity1 = new Activities({
        '_friendId': doc._id,
        '_userId': doc.senderId,
        '_uTargetId': doc.receiverId,
        'type': Config.Activities.AddFriend.Create
    });
    activity1.save(function  (err, act1) {
        if(!err)
            console.log('saved Activity1');
    });

});

// Post-remove hook
FriendSchema.post('remove', function(doc) {

    var Activities = mongoose.model('Activities');
    Activities.find({
        '_userId': doc._userId,
        '_friendId': doc._id
    }, function(err, activities) {
        if (activities && activities.length) {
            for (var i in activities) {
                activities[i].remove();
            }
        }
    });

});

// Export model
module.exports = mongoose.model('Friends', FriendSchema);
