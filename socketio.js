var Config = require('./config/config');
var Utilities = require('./config/utilities');
var Rooms = require('./controllers/rooms');
var Messages = require('./controllers/messages');

var mongoose = require('mongoose');
var Users = mongoose.model('Users');

// var array = ['Messages', 'Rooms', 'Files'];
// for (var i in array) {
//     mongoose.model(array[i]).find(function(err, docs) {
//         for (var i in docs) {
//             docs[i].remove();
//         }
//     });
// }

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
    global.io.on('connection', function(socket) {
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

        // On send message event
        socket.on('chat', function(data) {
            doChat(data);
        });

        // On seen chat event
        socket.on('seen', function(data) {
            doSeen(data);
        });

        // On join room event
        socket.on('join', function(data) {
            socket.join(data.roomId);
        });

        // On add user to room event
        socket.on('add', function(data) {
            doAdd(data);
        });

        // On leave room
        socket.on('leave', function(data) {
            doLeave(data);
        });

        // On disconnect event
        socket.on('disconnect', function() {
            console.log('********** socket id ' + socket.id + ' with username ' + userInfo.username + ' disconnected');
            updateUser(userInfo._id);
        });

        /* *************************** ACTIONS ******************************** */

        // Update redis data
        function updateRedisData() {
            store.get(userInfo._id, function(err, data) {
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

        // Init needed functions
        function initFunctions() {
            async.parallel({
                joinRooms: function(cb) {
                    // After connected, let user join to rooms which he/she is a member of
                    Rooms.getUserRooms(userInfo._id, function(roomIds) {
                        for (var i in roomIds) {
                            socket.join(roomIds[i]._id);
                        }
                    });
                    return cb();
                },
                checkDevices: function(cb) {
                    // Get device IP and informations
                    var ip = socket.handshake.address;

                    // Get device informations
                    var info = getDeviceInfo(socket.handshake.headers['user-agent']);

                    deviceInfo = {
                        '_userId': userInfo._id,
                        'informations': {
                            'ip': ip,
                            'osVersion': info.os,
                            'osType': info.type
                        }
                    };
                    // Find on database
                   /* UserDevices.findOne(deviceInfo, function(err, device) {
                        // If not found, add current device to user devices list
                        if (!device) {
                            var newDevice = new UserDevices(deviceInfo);
                            newDevice.type = info.Mobile ? Config.UserDevices.Types.Mobile : Config.UserDevices.Types.PC;
                            newDevice.save();
                        }
                        // Else set device status to online
                        else {
                            device.status = Config.UserDevices.Status.Online;
                            device.save();
                        }
                    });*/
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

        // Chat action
        function doChat(data) {
            console.log('chat data ', data);
            if (!data.message) {
                socket.emit('chat', Utilities.response(false, {}, 'Invalid informations'));
            } else {
                var members = [];
                if (data.members && data.members.length) {
                    members = data.members.slice();
                }

                // Do chat
                Messages.chat(data, userInfo, function(result) {
                    console.log('chat result ', result);
                    result.data.sequence = data.sequence;
                    // If failed, emit back to sender
                    if (!result.success) {
                        socket.emit('chat', result);
                    }
                    // Else emit to room
                    else {
                        // If create a new room, join user to room
                        if (result.data.room.isNewRoom) {
                            socket.join(result.data.room._id);
                        }

                        members = result.data.room.members.slice();
                        // Emit event to users in room
                        async.each(members, function(mem, cb) {
                            // Get user socket data in redis
                            store.get(mem, function(err, redisData) {
                                // If online, emit data
                                if (redisData) {
                                    redisData = JSON.parse(redisData);
                                    for (var i in redisData.socketId) {
                                        global.io.to(redisData.socketId[i]).emit('chat', result);
                                    }
                                }
                                // Update user database too
                            
                            });
                            return cb();
                        });
                    }
                });
            }
        }

        // Seen new messages in a room
        function doSeen(data) {
            if (!data.roomId) {
                socket.emit('seen', Utilities.response(false, data, 'Invalid informations'));
            } else {
                // Update user status in room
               
                socket.emit('seen', Utilities.response(true, data));
            }
        }

        // Add new users to room
        function doAdd(data) {
            if (data.roomId && data.members && data.members.length) {
                Rooms.addMembers(data, userInfo, function(result) {
                    // If failed, emit back to user
                    if (!result.success) {
                        socket.emit('add', result);
                    } else {
                        // Emit to room
                        global.io.to(data.roomId).emit('add', result);

                        var members = data.members.slice();

                        // Send join event to added users
                        async.each(members, function(mem, cb) {
                            store.get(mem, function(err, redisData) {
                                // If online, emit event
                                if (redisData) {
                                    redisData = JSON.parse(redisData);
                                    for (var i in redisData.socketId) {
                                        global.io.to(redisData.socketId[i]).emit('join', {
                                            'roomId': data.roomId
                                        });
                                    }
                                }
                            });
                            return cb();
                        });
                    }
                });
            } else {
                socket.emit('add', Utilities.response(false, {}, 'Invalid informations'));
            }
        }

        // User leave room
        function doLeave(data) {
            if (data.roomId) {
                Rooms.leave(data, userInfo._id, function(result) {
                    if (result.success) {
                        var isDestroy = result.data.isDestroy;
                        result.data.isDestroy = undefined;
                        delete result.data.isDestroy;
                        if (isDestroy) {
                            global.io.to(data.roomId).emit('destroyRoom', result);
                        } else {
                            // Leave room
                            socket.leave(data.roomId);
                            // Emit event to room
                            result.data._userId = userInfo;
                            global.io.to(data.roomId).emit('leave', result);
                        }
                    }
                    // Emit leave event to socket
                    socket.emit('leave', result);
                });
            } else {
                socket.emit('leave', Utilities.response(false, {}, 'Invalid informations'));
            }
        }

        // Update user latest active time
        function updateUser(userId) {
            async.parallel({
                updateUser: function(cb) {
                    Users.update({
                        '_id': userId
                    }, {
                        $set: {
                            'lastActivedAt': Date.now(),
                            'isOnline': false
                        }
                    }).exec();
                    return cb();
                },
                
                updateRedis: function(cb) {
                    store.get(userInfo._id, function(err, data) {
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
