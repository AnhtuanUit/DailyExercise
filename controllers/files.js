var mongoose = require('mongoose');
var Files = mongoose.model('Files');
var fs = require('fs');
var path = require('path');
var Utilities = require('../config/utilities');
var Config = require('../config/config');
var async = require('async');

exports.queryFile = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalfile id', 404));
        } else {
            File.findOne({
                '_id': id
            })
            .exec(function (err, file) {
                if (err || !file) {
                    return res.jsonp(Utilities.response(false, {}, 'File not found', 404));
                } else {
                    req.fileData = file;
                    console.log(file);
                    return next();
                }
            });
        }
    });
};


//Upload file
exports.uploadFile = function(req, res) {
    var oldPath = './public/tmp/' + req.files.file.name;
    var newPath;

    async.series({
        uploadImage: function(cb) {
            if (req.files.file.mimetype === 'video/mp4') {
                newPath = './public/video/';
            } else if (req.files.file.mimetype === 'audio/mp3') {
                newPath = './public/mp3/';
            } else if (req.files.file.mimetype === 'image/png' || req.files.file.mimetype === 'image/jpeg') {
                newPath = './public/images/';
            }

            newPath += req.files.file.name;
            fs.readFile(oldPath, function (err, data) {
                fs.writeFile(newPath, data, function(err) {
                    if (err) {
                        return cb(true, Utilities.getErrorMessage(req, err));
                    } else {
                        return cb(null);
                    }
                });
                fs.unlinkSync(oldPath);
            });
        },
        updateUser: function(cb) {
            var files = new File ({
                userId: req.user._id.toString(),
                name: req.files.file.name,
                originalName: req.files.file.originalname,
                type: req.files.file.mimetype,
                size: req.files.file.size
            });
            files.save (function (err, file) {
                if (err) {
                 return cb(true, Utilities.getErrorMessage(req, err)); 
             } else{
                return cb(true);
            };
        });
        }
    }, function (err, results) {
        if (err) {
            var keys = Object.keys(results);
            var last = keys[keys.length - 1];
            return res.jsonp(Utilities.response(false, {}, results[last]));
        } else {
            return res.jsonp(Utilities.response(true, {
                'link': 'getFileById'
            }));
        }
    });
};

//Upload image
exports.uploadImage = function(req, res, callback) {
    var oldPath = './public/tmp/' + req.files.file.name;
    var newName;

    async.series({
        uploadImage: function(cb) {
            if (req.files.file.mimetype === 'image/png' || req.files.file.mimetype === 'image/jpeg') {
                newPath = './public/images/';
            }

            newPath += req.files.file.name;
            fs.readFile(oldPath, function (err, data) {
                fs.writeFile(newPath, data, function(err) {
                    if (err) {
                        return cb(true, Utilities.getErrorMessage(req, err));
                    } else {
                        return cb(null);
                    }
                });
                fs.unlinkSync(oldPath);
            });
        },
        updateFile: function(cb) {
            var files = new Files ({
                userId: req.user._id.toString(),
                name: req.files.file.name,
                originalName: req.files.file.originalname,
                type: req.files.file.mimetype,
                size: req.files.file.size
            });
            files.save (function (err, file) {
                if (err) {
                 return cb(true, Utilities.getErrorMessage(req, err)); 
             } else{
                newName = file.name;
                return cb(null);
            };
        });
        }
    }, function (err, results) {
        return callback(err, results, newName);
    });
};

exports.getAllFile = function(req, res) {
    var fileInfo = [];
    var filePath = [];
    Files.find({
        userId: req.params.userId
    }, function(err, file) {
        if (err) {
            console.log(err);
        } else {
            for (var key in file) {
                fileInfo.push({
                    name: file[key].name,
                    type: file[key].type
                });
            }
            for (var i in fileInfo) {
                var fileType = fileInfo[i].type;
                var fileName = fileInfo[i].name;
                if (fileType === 'image/jpeg' || fileType === 'image/png') {
                    var imagePath = './public/images/' + fileName;
                    filePath.push(imagePath);
                } else if (fileType == 'audio/mp3') {
                    var mp3Path = './public/mp3/' + fileName;
                    filePath.push(mp3Path);
                }
            }
            res.jsonp(filePath);
        }
    });
};

exports.getFileByPath = function(req, res) {
    var path = req.params.filePath;
    if ((path.indexOf(".jpg") !== -1) || (path.indexOf(".png") !== -1)) {
        var imagePath = "./public/images/" + req.params.filePath;
        var stat = fs.statSync(imagePath);
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': stat.size
        });
        var readStream = fs.createReadStream(imagePath);
        readStream.pipe(res);
    } else if ((req.params.filePath.indexOf(".mp3") !== -1)) {
        var mp3Path = "./public/mp3/" + req.params.filePath;
        var stat = fs.statSync(mp3Path);
        res.writeHead(200, {
            'Content-Type': 'audio/mp3',
            'Content-Length': stat.size
        });
        var readStream = fs.createReadStream(mp3Path);
        readStream.pipe(res);
    } else if ((req.params.filePath.indexOf(".mp4") !== -1)) {
        var mp3Path = "./public/video/" + req.params.filePath;
        var stat = fs.statSync(mp3Path);
        res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size
        });
        var readStream = fs.createReadStream(mp3Path);
        readStream.pipe(res);
    }
};


/*DELETE file by Id*/
exports.removeFile = function(name, type) {
    switch(type) {
        case Config.Messages.Types.Image:
        fs.unlinkSync('./public/images/' + name);
        Files.findOne({'name': name}, function  (err, file) {
            if(file){
                file.remove();
            }
            else
            {
                console.log("removeFile" + err);
            }    
        });

        console.log("Deleted " + './public/images/' + name);
        break;
        case Config.Messages.Types.File:
        Files.findOne({'name': name}, function  (err, file) {
            if(file){
                file.remove();
            }
            else
            {
                console.log("removeFile" + err);
            }    
        });
        fs.unlinkSync('./public/File/' + name);
        console.log("Deleted " + './public/mp3/' + name)
        break;
    }
};
