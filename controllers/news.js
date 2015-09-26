var mongoose = require('mongoose');
var News = mongoose.model('News');
var Utilities = require('../Config/utilities');

exports.queryNews = function(req, res, next, id) {
    Utilities.validateObjectId(id, function(isValid) {
        if (!isValid) {
            return res.status(404).jsonp(Utilities.response(false, {}, 'Invalid news id', 404));
        } else {
            News.findOne({
                '_id': id
            }).exec(function(err, news) {
                if (err) {
                    return res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
                } else if (!news) {
                    return res.status(404).jsonp(Utilities.response(false, {}, 'News not found', 404));
                } else {news
                    req.newsData = news;
                    return next();
                }
            });
        }
    });
};


exports.getAllNews = function  (req, res) {
	News.find({}, function  (err, news) {
		if (news) {
			res.jsonp(Utilities.response(true, news));
		} else{
			res.jsonp(Utilities.response(false, {}, 'News not found'));
		};
	});
}

exports.createNews = function  (req, res) {
	var userId = req.user._id;
	var news = new News(req.body);
	news._userId = userId;
	news.save(function  (err, news) {
		if (err) {

			res.jsonp(Utilities.response(false, {}, Utilities.getErrorMessage(req, err)));
		} else{
			res.jsonp(Utilities.response(true, {'newsId': news._id}));

		};
	});
}

exports.removeNewsByNewsId = function  (req, res) {
	var news = req.newsData;
	news.remove(function  (err) {
		if (err) {
			res.jsonp(Utilities.response(false,{}, Utilities.getErrorMessage(req, err)));
		} else{
			res.jsonp(Utilities.response(true));
		};
	});
}