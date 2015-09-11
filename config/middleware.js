var mongoose = require('mongoose');
var Users = mongoose.model('Users');
var Config = require('./config');
var Utilities = require('./utilities');
var jwt = require('jsonwebtoken');

exports.isXhr = function(req, res, next) {
    if (req.xhr) {
        return next();
    } else {
        return res.jsonp(Utilities.response(false));
    }
};

exports.isAuthentication = function(req, res, next) {
	if ((req.user._id === req.userData._id.toString()) || req.user.role === 1) {
		return next();
	} else {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	}
};

exports.isEventAdmin = function(req, res, next) {
	if (!~req.eventData.admins.indexOf(req.user._id.toString())) {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	} else {
		return next();
	}
};

exports.isEventCreator = function(req, res, next) {
	if ((req.eventData._userId._id.toString() === req.user._id.toString()) || (req.user.role === 1)) {
		return next();
	} else {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	}
};

exports.isInEvent = function(req, res, next) {
	mongoose.model('EventMembers').count({
		'_eventId': req.params.eventId,
		'_userId': req.user._id.toString(),
		'status': Config.EventMembers.Status.Joined
	}, function(err, c) {
		if (err || !c) {
			return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
		} else {
			return next();
		}
	});
};

exports.isInRoom = function(req, res, next) {
	var roomId = req.params.leanRoomId ? req.params.leanRoomId : (req.params.roomId ? req.params.roomId : '');
	mongoose.model('Rooms').count({
		'_id': roomId,
		'members': req.user._id.toString()
	}, function(err, c) {
		if (err || !c) {
			return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
		} else {
			return next();
		}
	});
};

exports.isInboxAuthorization = function(req, res, next, id) {
	mongoose.model('Inbox').count({
		'_id': id,
		'_userId': req.user._id	
	}, function(err, c) {
		if (err || !c) {
			return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
		} else {
			return next();
		}
	});
};

exports.isPostCreator = function(req, res, next) {
	if ((req.postData._userId._id.toString() === req.user._id.toString()) || (req.user.role === 1)) {
		return next();
	} else {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	}
};

exports.isCommentCreator = function(req, res, next) {
	if ((req.commentData._userId.toString() === req.user._id.toString()) || (req.user.role === 1)) {
		return next();
	} else {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	}
};

exports.isFileCreator = function(req, res, next) {
	if ((req.fileData._userId._id.toString() === req.user._id.toString()) || (req.user.role === 1)) {
		return next();
	} else {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	}
};

exports.isAdmin = function(req, res, next) {
	if (req.user.role === 1) {
		return next();
	} else {
		return res.status(401).jsonp(Utilities.response(false, {}, 'Access denied', 401));
	}
};
