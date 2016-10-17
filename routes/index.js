var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var router = express.Router();
var nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com');

router.get('/', function (req, res) {
	res.render('index', { user : req.user });
});

router.get('/register', function(req, res) {
	res.render('register', { });
});

router.post('/register', function(req, res, next) {
	Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
		if (err) {
		  return res.render('register', { error : err.message });
		}

		passport.authenticate('local')(req, res, function () {
			req.session.save(function (err) {
				if (err) {
					return next(err);
				}
				res.redirect('/');
			});
		});
	});
});


router.get('/login', function(req, res) {
	res.render('login', { user : req.user, error : req.flash('error')});
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res, next) {
	req.session.save(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});

router.get('/logout', function(req, res, next) {
	req.logout();
	req.session.save(function (err) {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});

router.get('/cheer', function(req, res) {
	Account.find({}, function(err, users) {
	if (err) throw err;
	var usernames = [];
	users.forEach(function(user) {
		usernames.push(user.username);
	});
	res.render('cheer', {usernames : JSON.stringify(usernames)});
	});
});

router.post('/cheer', function(req, res) {
	console.log(Account);
	var transporter = nodemailer.createTransport("SMTP",{
	   service: "Gmail",  // sets automatically host, port and connection security settings
	   auth: {
		   user: "nodemailercomp3900@gmail.com",
		   pass: "test_mail"
	   }
	});
	
	var mailOptions = {
		from: '"John Doe" <nodemailercomp3900@gmail.com>', // sender address
		to: 'Gaston.E.Beaucage@gmail.com', // list of receivers
		subject: 'Compliment from' + req.body.username, // Subject line
		text: 'Thank you!', // plaintext body
		html: '<b>'+ req.body.text +'</b>' // html body
	};

	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
});

router.get('/ping', function(req, res){
	res.status(200).send("pong!");
});

module.exports = router;
