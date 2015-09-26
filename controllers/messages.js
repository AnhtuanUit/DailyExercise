var mongoose = require('mongoose');
var Messages = mongoose.model('Messages');
var Users = mongoose.model('Users');
var Config = require('../config/config');
var Utilities = require('../config/utilities');
var store = require('redis').createClient();
var async = require('async');


exports.getRoomMessagesByTargetId = function(req, res) {
    var targetId = req.params.targetId ? req.params.targetId.toString() : '';
    var userId = req.user._id.toString();
    console.log(userId + " " + targetId);
    Messages.find({$or:[{
        '_userId': userId,
        '_targetId': targetId
    },
    {
        '_userId': targetId,
        '_targetId': userId
    }]

},function  (err, message) {
  async.map (message, function (msg, cb) {
    Users.findOne({'_id': msg._userId}, function  (err, user) {
     Users.detail(user, null, function  (data) {
        Messages.detail (data, msg, function (u) {
            return cb (null, u);
        });
    });
 });

    
}, function (err, data) {
    return res.jsonp(Utilities.response (true, data));
});
});

};

exports.saveChatMessage = function (data, sender, callback) {
    var msg = new Messages({
        '_targetId': data.targetId,
        'message': data.message,
        '_userId': data.userId
    });
    console.log(msg);

    msg.save(function(err, response) {
        if (err) {
            console.log("save message lost");
        } else {
         console.log("save message success " + response);
         generateChatResponse(err, response, sender, callback);
     }
 });    
}

function generateChatResponse(err, response, sender, callback) {
    if (err) {
        return callback({});
    } else {
        return callback({
            user: {
                _id: sender._id,
                username: sender.username,
                avatar: sender.avatar
            },
            message: {
             message: response.message,
             createdAt: response.createdAt,
             type: response.type
         }
     });
    }
}
/*
exports.saveMessage = function  (req, res) {
    var data =req.body;
    var msg = new Messages({
        '_targetId': data.targetId,
        'message': data.message,
        '_userId': data.userId
    });

    msg.save(function(err) {
        if (err) {
            console.log(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
        } else {
           res.jsonp(Utilities.response(true))

       }
   });
}

// Middleware
exports.queryLeanMessage = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.jsonp(Utilities.response(false, {}, 'Invalid message id'));
        } else {
            Messages.findOne({
                '_id': id
            }).lean().populate('_roomId', 'title members').exec(function(err, message) {
                if (err) {
                    return res.status(500).jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err), 500));
                } else if (!message) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'Message not found', 404));
                } else {
                    req.messageData = message;
                    return next();
                }
            });
        }
    });
};
*/