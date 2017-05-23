var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt-nodejs');

var Account = new Schema({
	username: String,
	password: String,
	role:	  String,
	admin:	  String,
	employeeIDs: [String]
});

Account.methods.validatePassword = function (password, callback) {
  this.authenticate(password, callback);
};

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('accounts', Account);