var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FileSchema = new Schema({
	name:{
		required: true,
		unique: true,
		type: String
	},
	userId:String,
	originalName:{
		type: String,
		required: true
	},
	type: String
	,
	createAt:{
		type: Date,
		default: Date.now
	},
	encoding: String,
	size: Number,
	extension: String
},{
	collection:'files'
});

//Export model
module.exports = mongoose.model('Files', FileSchema);