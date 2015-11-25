var Config = require('./config/config');
var Utilities = require('./config/utilities');
var Messages = require('./controllers/messages');

var mongoose = require('mongoose');
var Users = mongoose.model('Users');
var Friends = mongoose.model('Friends');

var async = require('async');

function connectIO(server) {
    global.io = require('socket.io')(server);
    var socketioJwt = require('socketio-jwt');
    var redis = require('socket.io-redis');
    var store = require('redis').createClient();

    global.io.adapter(redis({
        host: Config.Env[process.env.NODE_ENV].Redis.Host,
        port: Config.Env[process.env.NODE_ENV].Redis.Port
    }));

    global.io.use(socketioJwt.authorize({
        secret: Config.JWTSecret,
        handshake: true
    }));

    // On connect
    global.io.on('connection', function (socket) {
        var userInfo = socket.decoded_token;
        userInfo.iat = undefined;
        delete userInfo.iat;
        var deviceInfo = {};
        console.log('********** socket id ' + socket.id + ' with username ' + userInfo.username + ' connected');

        // Save client data to redis with key is userId
        updateRedisData();

        // Do asynchronous neccessary functions
        initFunctions();

        /* *************************** EVENTS ******************************** */


        //On add friend
        socket.on('addFriend', function  (data){
            doAddFriend(data);
        });
        //On accept friend
        socket.on('AcceptFriend', function  (data) {
            doAcceptFriend(data);
        })
        // On send message chat
        socket.on('chat', function (data) {
            doChat(data);
        });

        // On leave room
        socket.on('leave', function (data) {
            doLeave(data);
        });

        // On disconnect app
        socket.on('disconnect', function() {
            console.log('********** socket id ' + socket.id + ' with username ' + userInfo.username + ' disconnected');
            updateUser(userInfo._id);
        });

        /* *************************** ACTIONS ******************************** */

        // Update redis data
        function updateRedisData() {
            store.get(userInfo._id, function (err, data) {
                var clientData;
                if (data) {
                    clientData = JSON.parse(data);
                    clientData.socketId.push(socket.id);
                } else {
                    clientData = {
                        'socketId': [socket.id],
                        'userInfo': JSON.stringify(userInfo)
                    };
                }
                store.set(userInfo._id, JSON.stringify(clientData));
            });
        }


        function initFunctions() {
            async.parallel({
                checkDevices: function(cb) {

                    var ip = socket.handshake.address;

                    var info = getDeviceInfo(socket.handshake.headers['user-agent']);

                    deviceInfo = {
                        '_userId': userInfo._id,
                        'informations': {
                            'ip': ip,
                            'osVersion': info.os,
                            'osType': info.type
                        }
                    };


                    return cb();
                },
                setOnline: function(cb) {
                    Users.update({
                        '_id': userInfo._id
                    }, {
                        $set: {
                            'isOnline': true
                        }
                    }).exec();
                    return cb();
                }
            });
        }



        function doAddFriend (data) {
            console.log("data: " + data);
            var senderId = userInfo._id;
            var members = [data, userInfo._id];

            var friend = new Friends({
                'senderId': senderId,
                'receiverId': data
            });

            Friends.checkFriend(friend, function  (fr) {

                if (!fr && senderId != data) {
                    friend.save(function  (err) {
                        if (err) {
                            return console.log(err);
                        } else {
                            mongoose.model('Friends').detailForSocket(friend, userInfo, function  (data) {
                                async.each(members, function (mem, cb) {
                                    store.get(mem, function (err, redisData) {
                                        if (redisData) {
                                            redisData = JSON.parse(redisData);    
                                            for (var i in redisData.socketId) {                    
                                                global.io.to(redisData.socketId[i]).emit('addFriend', Utilities.response(true, data));   
                                            }                             
                                        }

                                    });
                                });

                            });
                        }
                    });


} 
});
}

function doAcceptFriend (data) {
    console.log('data: ' + data);
    var friendId = data;

    Friends.update({'_id': friendId}, {success: true}, function  (err, friend) {
      
        if (err) {
            return console.log(err);    
        } else{
         var members = [friend.senderId, userInfo._id];

         mongoose.model('Friends').detailForSocket(friend, userInfo, function  (data) {
          async.each(members, function (mem, cb) {
              store.get(mem, function (err, redisData) {
                                // If online, emit data
                                if (redisData) {
                                    redisData = JSON.parse(redisData);
                                    for (var i in redisData.socketId) {
                                        global.io.to(redisData.socketId[i]).emit('AcceptFriend', Utilities.response(true, data));
                                    }
                                }

                            });

          });
      });
     }

     
 });

}


        // Chat action
        function doChat(data) {
            console.log("data: "+ data);
            if (!data.message) {
                socket.emit('chat', Utilities.response(false, {}, 'Invalid informations'));
            } else {

                Messages.saveChatMessage(data, userInfo, function (result) {
                    console.log("result: "+result);
                    members = [userInfo._id, data.targetId].slice();
                    async.each(members, function (mem, cb) {
                       store.get(mem, function (err, redisData) {
                                // If online, emit data
                                if (redisData) {
                                    redisData = JSON.parse(redisData);
                                    for (var i in redisData.socketId) {
                                        global.io.to(redisData.socketId[i]).emit('chat', 
                                            Utilities.response(true, result));
                                    }
                                }

                            });
                   });
                });
                
            }
        }


        // User leave room
        function doLeave(data) {

        }

        // Update user latest active time
        function updateUser(userId) {
            async.series({
                updateRedis: function(cb) {
                    store.get(userInfo._id, function (err, data) {
                        if (data) {
                            var clientData = JSON.parse(data);

                            // If have only 1 socket, delete key
                            if (clientData.socketId.length === 1) {
                                store.del(userInfo._id);
                            } else {
                                // Find current user index
                                var index = clientData.socketId.indexOf(socket.id);
                                // Remove out of array
                                clientData.socketId.splice(index, 1);
                                store.set(userInfo._id, JSON.stringify(clientData));
                            }
                        }
                        return cb();
                    });
                }
            });
        }
    });
}

function getDeviceInfo(ua) {
    var info = {};

    info.Mobile = /mobile/i.test(ua);

    if (/like Mac OS X/.test(ua)) {
        info.os = /CPU( iPhone)? OS ([0-9\._]+) like Mac OS X/.exec(ua)[2].replace(/_/g, '.');
        info.type = 'iOs';
        // info.iPhone = /iPhone/.test(ua);
        // info.iPad = /iPad/.test(ua);
    }

    if (/Android/.test(ua)) {
        info.os = /Android ([0-9\.]+)[\);]/.exec(ua)[1];
info.type = 'AndroidOS';
}

if (/webOS\//.test(ua)) {
    info.os = /webOS\/([0-9\.]+)[\);]/.exec(ua)[1];
info.type = 'WebOS';
}

if (/(Intel|PPC) Mac OS X/.test(ua)) {
    info.os = /(Intel|PPC) Mac OS X ?([0-9\._]*)[\)\;]/.exec(ua)[2].replace(/_/g, '.') || true;
info.type = 'MacOS';
}

if (/Windows NT/.test(ua)) {
    info.os = /Windows NT ([0-9\._]+)[\);]/.exec(ua)[1];
info.type = 'Windows';
}

return info;
}

exports = module.exports = connectIO;
