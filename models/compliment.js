var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Compliment = new Schema({
	sender: String,
	receiver: String,
	message: String,
	swearing: Boolean,
	visible: Boolean,
	number: Number
});

module.exports = mongoose.model('compliment', Compliment);