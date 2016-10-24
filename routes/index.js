var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var Compliment = require('../models/compliment');
var router = express.Router();
var nodemailer = require("nodemailer");
var randomstring = require("randomstring");

var os = require('os');
var ifaces = os.networkInterfaces();

var addresses = [];

Object.keys(ifaces).forEach(function (ifname) {
	var alias = 0;

	ifaces[ifname].forEach(function (iface) {
		if ('IPv4' !== iface.family || iface.internal !== false) {
			return;
		}
		if (alias >= 1) {
			console.log("1");
			console.log(ifname + ':' + alias, iface.address);
			addresses.push(iface.address);
		} else {
			console.log("1");
			console.log(ifname, iface.address);
			addresses.push(iface.address);
		}
		++alias;
	});
});

var localip = addresses[0];

router.get('/', function (req, res) {
	Compliment.find({}, function(err, compliments) {
		if (err) throw err;
		var messages = [];
		compliments.forEach(function(compliment) {
			messages.push(compliment.message);
		});
		res.render('index', { user : req.user, messages: messages});
	});
});

router.get('/actcode', function(req, res) {
	console.log(req.query);
	
	Account.find({username: req.query.username}, function(err, user) {
		if (err) throw err;
		if(user[0].actcode.localeCompare(req.query.actcode) == 0) {
			user[0].active = true;
			user[0].save(function(err) {
				if (err) throw err;
				console.log(user[0]);
				console.log('Account updated successfully!');
			});
		}
	});
	res.redirect('/');
});

router.get('/register', function(req, res) {
	res.render('register', { });
});

router.post('/register', function(req, res, next) {
	var actcode = randomstring.generate(32);
	Account.register(new Account({ username : req.body.username, active: false, actcode: actcode}), req.body.password, function(err, account) {
		if (err) {
		  return res.render('register', { error : err.message });
		}

		passport.authenticate('local')(req, res, function () {
			req.session.save(function (err) {
				if (err) {
					return next(err);
				}
				var transporter = nodemailer.createTransport("SMTP",{
					service: "Gmail",  // sets automatically host, port and connection security settings
					auth: {
						user: "nodemailercomp3900@gmail.com",
						pass: "*****"
					}
				});
				
				var mailOptions = {
					from: '"John Doe" <nodemailercomp3900@gmail.com>', // sender address
					to: 'Gaston.E.Beaucage@gmail.com', // list of receivers
					subject: 'Account creation confirmation', // Subject line
					text: 'SMTP does not support html', // plaintext body
					html: '<a href="http://' + localip + ':3000/actcode?username=' + req.body.username +'&actcode=' + actcode + '">Complete registration</a> ' // html body
				};
				
				transporter.sendMail(mailOptions, function(error, info){
					if(error){
						return console.log(error);
					}
					console.log('Message sent: ' + info.response);
				});
				
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
		if(req.user != undefined) {
			Account.find({username: req.user.username}, function(err, user) {
				if (err) throw err;
				console.log(req.user);
				res.render('cheer', {usernames : JSON.stringify(usernames), active : user[0].active});
			});
		} else {
			res.render('cheer', {usernames : JSON.stringify(usernames), active : false});
		}
	});
});

router.post('/cheer', function(req, res) {
	var transporter = nodemailer.createTransport("SMTP",{
	   service: "Gmail",  // sets automatically host, port and connection security settings
	   auth: {
		   user: "nodemailercomp3900@gmail.com",
		   pass: "*****"
	   }
	});
	
	var mailOptions = {
		from: '"John Doe" <nodemailercomp3900@gmail.com>', // sender address
		to: 'Gaston.E.Beaucage@gmail.com', // list of receivers
		subject: 'Compliment from' + req.body.user, // Subject line
		text: 'Thank you!', // plaintext body
		html: '<b>'+ req.body.text +'</b>'
	};

	var compliment = new Compliment({sender: req.user, receiver: req.body.username, message: req.body.text});
	compliment.save(function(err) {
	  if (err) throw err;

	  console.log('Compliment saved successfully!');
	});
	
	res.redirect('/');
	
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
