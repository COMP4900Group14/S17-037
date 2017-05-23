var express = require('express');
var passport = require('passport');
var multer = require('multer');
//var upload = multer({dest: './pretripImages/'});
var Account = require('../models/account');
var Pretrip = require('../models/pretrip');
var router = express.Router();
var nodemailer = require("nodemailer");
var randomstring = require("randomstring");
var fs = require('fs');
var crypto = require('crypto');
var mime = require('mime');

var SUPERUSER = "superuser";
var ADMIN = "admin";
var HYBRID = "hybrid";
var VEHICLE = "vehicle";

var pretripNum = 0;
Pretrip.find({}, function(err, messages) {
	messages.forEach(function(message) {
		if(message.number > pretripNum) {
			pretripNum = message.number;
		}
	});
});

function notify(emailToNotify, subject, message) {
	var transporter = nodemailer.createTransport("SMTP",{
		service: "Gmail",  // sets automatically host, port and connection security settings
		auth: {
			user: "nodemailercomp3900@gmail.com",
			pass: "Blahmail_random"
		}
	});
	
	var mailOptions = {
		from: '"posAbilities Do Not Respond" <nodemailercomp3900@gmail.com>', // sender address
		to: emailToNotify, // list of receivers
		subject: subject, // Subject line
		text: 'SMTP does not support html', // plaintext body
		html: '<p>' + message + '</p>' // html body
	};
	
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
}

function isLow(myString) {
	if((myString.localeCompare("0%") == 0) ||
	   (myString.localeCompare("25%") == 0) || 
	   (myString.localeCompare("50%") == 0) ) {
		return true;
	} else {
		return false;
	}
}

function checkFlag(myString) {
	var lastChar = myString[myString.length - 1];
	return lastChar == '1';
}

function removeCharFlag(myString) {
	return myString.substring(0, myString.length - 1);
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/')
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
		cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
    });
  }
});
var upload = multer({ storage: storage });

router.get('/', function (req, res) {
	console.log(removeCharFlag("missing1"));
	if(req.user != undefined ) {
		res.render('index', { user : req.user.role, error : req.flash('error')});
	} else {
		res.render('index', { user : req.user, error : req.flash('error')});
	}
});


router.get('/register', function(req, res) {
	if(req.user != undefined ) {
		res.redirect('/');
	} else {
		res.render('register', {});
	}
});

router.post('/register', function(req, res, next) {

	Account.register(new Account({ username : req.body.username, 
								   role  : SUPERUSER,
								   employeeIDs: []
								 }), req.body.password, function(err, account) {
		if (err) {
		  return res.render('register', { error : true });
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

router.get('/changePass', function(req, res) {
	if(req.user != undefined ) {
		res.render('changePass', {user: req.user.role});
	} else {
		res.redirect('/');
	}
});

router.post('/changePass', function(req, res, next) {
	if(req.user != undefined ) {
		Account.findByUsername(req.user.username, function(err, user) {
			user.authenticate(req.body.password, (err) => {
				if (err) {
					return res.render('changePass', {user: req.user.role, error : true });
				}
				// password validation was ok
				user.setPassword(req.body.newPassword, () => {
					user.save((err) => {
						if (err) throw err;
						res.redirect('/');
					});
				});
			});
		});
	} else {
		res.redirect('/');
	}
});


router.get('/login', function(req, res) {
	if(req.user != undefined ) {
		res.redirect('/');
	} else {
		res.render('login', { user : req.user, error : req.flash('error')});
	}
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

router.get('/pretrip', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(HYBRID) == 0 ||
			   user[0].role.localeCompare(VEHICLE) == 0) {
				res.render('pretrip', { user : req.user.role, error : req.flash('error')});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/pretrip', upload.any(), function(req, res) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(HYBRID) == 0 ||
			   user[0].role.localeCompare(VEHICLE) == 0) {
				var date = new Date();
				var month = date.getMonth() + 1;
				if(month.toString().length == 1) {
					month = "0" + month;
				}  
				var day = date.getDate();
				if(day.toString().length == 1) {
					day = "0" + day;
				} 
				var year = date.getFullYear();

				var yyyymmdd = year + "-" + month + "-" + day;
				var doctored = false;
				if((yyyymmdd.localeCompare(req.body.front_date_) != 0) ||
				   (yyyymmdd.localeCompare(req.body.back_date_) != 0) ||
				   (yyyymmdd.localeCompare(req.body.left_date_) != 0) ||
				   (yyyymmdd.localeCompare(req.body.right_date_) != 0)) {
					console.log("doctored image detected!");
					notify("Gaston.E.Beaucage@gmail.com", "Suspected Image Doctoring", "Suspected image doctoring by " + req.user.username);
				}
				var issueDetected = false;
				var issueDescription = "Issues reported for vehicle plate number: " + req.body.vehicleLicencePlate_ + "<br /><br />";
				issueDescription += "Issues Descriptions:<br /><br />";
				if(isLow(req.body.oil_levels_)) {
					issueDetected = true;
					issueDescription += "Oil levels are low<br />";
				}
				if(isLow(req.body.coolant_levels_)) {
					issueDetected = true;
					issueDescription += "Coolant levels are low<br />";
				}
				if(isLow(req.body.transmissionFluids_levels_)) {
					issueDetected = true;
					issueDescription += "Transmission fluid levels are low<br />";
				}
				if(isLow(req.body.powerSteering_levels_)) {
					issueDetected = true;
					issueDescription += "Power steering fluid levels are low<br />";
				}
				if(isLow(req.body.brakeFluid_levels_)) {
					issueDetected = true;
					issueDescription += "Brake fluid levels are low<br />";
				}
				if(isLow(req.body.wiperFluid_levels_)) {
					issueDetected = true;
					issueDescription += "Wiper fluid levels are low<br />";
				}
				if(checkFlag(req.body.belts_)) {
					issueDetected = true;
					issueDescription += "Belts are worn on the engine<br />";
				}
				if(checkFlag(req.body.leaks_)) {
					issueDetected = true;
					issueDescription += "Leaks are present under the vehicle<br />";
				}
				if(checkFlag(req.body.battery_)) {
					issueDetected = true;
					issueDescription += "Battery power levels are low<br />";
				}
				if(checkFlag(req.body.wiring_)) {
					issueDetected = true;
					issueDescription += "Wires are frayed<br />";
				}
				if(checkFlag(req.body.hoses_)) {
					issueDetected = true;
					issueDescription += "Leaks are present on hoses<br />";
				}
				if(checkFlag(req.body.clamps_)) {
					issueDetected = true;
					issueDescription += "Hose clamps are damaged<br />";
				}
				if(checkFlag(req.body.measurePressure_)) {
					issueDetected = true;
					issueDescription += "Tire pressure is low<br />";
				}
				if(checkFlag(req.body.lugNuts_)) {
					issueDetected = true;
					issueDescription += "Tire lug nuts are loose<br />";
				}
				if(checkFlag(req.body.treads_)) {
					issueDetected = true;
					issueDescription += "Tire treads are low<br />";
				}			
				if(checkFlag(req.body.rims_)) {
					issueDetected = true;
					issueDescription += "Wheel rims are damaged<br />";
				}
				if(checkFlag(req.body.spare_)) {
					issueDetected = true;
					issueDescription += "Spare tire is missing<br />";
				}
				if(checkFlag(req.body.flares_)) {
					issueDetected = true;
					issueDescription += "Flares are missing<br />";
				}
				if(checkFlag(req.body.fireExtinguisher_)) {
					issueDetected = true;
					issueDescription += "Fire extinguisher is missing<br />";
				}
				if(checkFlag(req.body.seatBeltClutter_)) {
					issueDetected = true;
					issueDescription += "Seat belt cutter is missing<br />";
				}
				if(checkFlag(req.body.boosterCables_)) {
					issueDetected = true;
					issueDescription += "Booster cables are missing<br />";
				}
				if(checkFlag(req.body.vehicleDocument_insurance_)) {
					issueDetected = true;
					issueDescription += "Vehicle insurance papers are missing<br />";
				}
				
				if(issueDetected) {
					issueDescription += "\nVehicle operators notes about issues:<br />";
					issueDescription += req.body.notes_ + "<br />";
					issueDescription += "These issues were fixed by the operator: " + (req.body.fixed_ ? true : false);
					//For demo purposes
					//notify(req.user.admin, issueDescription);
					notify("Gaston.E.Beaucage@gmail.com", "Vehicle plate number: " + req.body.vehicleLicencePlate_ + " Damage reported", issueDescription);
				}
				
				var pretrip = new Pretrip({creatorID:    					req.user.username									  , 
										   pretripNum: 						pretripNum++										  ,
										   vehicleLicencePlate: 			req.body.vehicleLicencePlate_						  ,
										   fleet: 							req.body.fleet_										  ,
										   backUpLighs:						req.body.backUpLighs_ 					? true : false,
										   brakeLights: 					req.body.brakeLights_ 					? true : false,
										   emergencyFlashers:				req.body.emergencyFlashers_ 			? true : false,
										   headLights_high_low:				req.body.headLights_high_low_ 			? true : false,
										   interiorLights:					req.body.interiorLights_ 				? true : false,
										   sideMarkers:						req.body.sideMarkers_ 					? true : false,
										   turnSignals:						req.body.turnSignals_ 					? true : false,				
										   licensePlate:					req.body.licensePlate_ 					? true : false,
										   oil:								req.body.oil_ 							? true : false,
										   visualPressureCheck:				req.body.visualPressureCheck_ 			? true : false,
										   preAndPostTripBodyInspection:	req.body.preAndPostTripBodyInspection_  ? true : false,
										   windshieldVisibility:			req.body.windshieldVisibility_ 			? true : false,
										   mirrors:							req.body.mirrors_ 						? true : false,
										   steering:						req.body.steering_ 						? true : false,
										   horn:							req.body.horn_ 							? true : false,
										   fuelLevel:						req.body.fuelLevel_ 					? true : false,
										   wipers:							req.body.wipers_ 						? true : false,
										   seatBelts_lifts_straps:			req.body.seatBelts_lifts_straps_ 		? true : false,
										   oil_levels: 						req.body.oil_levels_								  ,
										   coolant_levels: 					req.body.coolant_levels_							  ,
										   transmissionFluids_levels: 		req.body.transmissionFluids_levels_					  ,
										   powerSteering_levels: 			req.body.powerSteering_levels_						  ,
										   brakeFluid_levels: 				req.body.brakeFluid_levels_							  ,
										   wiperFluid_levels: 				req.body.wiperFluid_levels_							  ,
										   belts: 							removeCharFlag(req.body.belts_)						  ,
										   leaks: 							removeCharFlag(req.body.leaks_)						  ,
										   battery: 						removeCharFlag(req.body.battery_)					  ,
										   wiring: 							removeCharFlag(req.body.wiring_)					  ,
										   hoses: 							removeCharFlag(req.body.hoses_)						  ,
										   clamps: 							removeCharFlag(req.body.clamps_)					  ,
										   measurePressure: 				removeCharFlag(req.body.measurePressure_)			  ,
										   lugNuts: 						removeCharFlag(req.body.lugNuts_)					  ,
										   treads: 							removeCharFlag(req.body.treads_)					  ,
										   rims: 							removeCharFlag(req.body.rims_)						  ,
										   spare: 							removeCharFlag(req.body.spare_)						  ,
										   flares: 							removeCharFlag(req.body.flares_)					  ,
										   fireExtinguisher: 				removeCharFlag(req.body.fireExtinguisher_)			  ,
										   jack_wheelWrench: 				removeCharFlag(req.body.jack_wheelWrench_)			  ,
										   seatBeltClutter: 				removeCharFlag(req.body.seatBeltClutter_)			  ,
										   boosterCables: 					removeCharFlag(req.body.boosterCables_)				  ,
										   vehicleDocument_insurance: 		removeCharFlag(req.body.vehicleDocument_insurance_)   ,
										   frontImage:						req.files[0].filename								  ,
										   backImage: 						req.files[1].filename								  ,
										   leftImage: 						req.files[2].filename								  ,
										   rightImage: 						req.files[3].filename								  ,
										   fixed:							req.body.fixed_						  	? true : false,
										   notes:							req.body.notes_
										   });
				pretrip.save(function(err) {
					if (err) throw err;
					console.log('Pretrip saved successfully!');
				});
			} else {
				res.redirect('/');
			}
		});
	}
	res.redirect('/');
});

router.get('/createAcct', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(SUPERUSER) == 0) {
				res.render('createAcct', { user : req.user.role});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/createAcct', function(req, res, next) {
	Account.register(new Account({ username : req.body.username, 
								   role  : req.body.userRole,
								   employeeIDs: []
								 }), "password", function(err, account) {
		if (err) {
			return res.render('createAcct', {user : req.user.role, error : true });
		}
		res.redirect('/');
	});
});

router.get('/removeAcct', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(SUPERUSER) == 0) {
				var usernames = [];
				Account.find({}, function(err, users) {
					users.forEach(function(user) {
						if(req.user.username.localeCompare(user.username) != 0) {
							usernames.push(user.username);
						}
					});
					res.render('removeAcct', { user : req.user.role, usernames: usernames});
				});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/removeAcct', function(req, res, next) {
	Account.remove({ username : req.body.username }, function(err) {
		if (err) throw err;
		res.redirect('/');
	});
});


router.get('/pretripQuery', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(ADMIN) == 0 ||
			   user[0].role.localeCompare(HYBRID) == 0) {
				res.render('pretripQuery', { user : req.user.role});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/pretripQuery', function(req, res, next) {
	var curDay = new Date(req.body.date);
	Pretrip.find({vehicleLicencePlate: req.body.plate}, function(err, pretrips) {
		var pretripArray = [];
		pretrips.forEach(function(pretrip) {
			if((curDay.getFullYear() == pretrip.dateArchieved.getFullYear()) &&
			   (curDay.getDate() + 1     == pretrip.dateArchieved.getDate())     &&
			   (curDay.getMonth()    == pretrip.dateArchieved.getMonth())) {
				pretripArray.push(pretrip);
			}
		});
		if(pretripArray.length != 0) {
			return res.render('viewPretrip', { user : req.user.role, pretrips: pretripArray});
		} else {
			return res.render('pretripQuery', { user : req.user.role, error: "No pretrips found with that plate number and date"});
		}
	});
});

router.get('/addOp', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(ADMIN) == 0 ||
			   user[0].role.localeCompare(HYBRID) == 0) {
				var vehicleOps = [];
				Account.find({}, function(err, users) {
					users.forEach(function(user) {
						if(req.user.username.localeCompare(user.username) != 0) {
							if(user.role.localeCompare(VEHICLE) == 0) {
								var add = true;
								req.user.employeeIDs.forEach(function(employeeID) {
									if(employeeID.localeCompare(user.username) == 0) {
										add = false;
									}
								});
								if(add) {
									if(user.role.localeCompare(VEHICLE) == 0) {
										vehicleOps.push(user.username);
									}
								}	
							}
						}
					});
					res.render('addOp', { user : req.user.role, vehicleOps: vehicleOps});
				});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/addOp', function(req, res, next) {
	Account.find({username: req.user.username}, function(err, user) {
		user[0].employeeIDs.push(req.body.username);
		user[0].save();
		Account.find({username: req.body.username}, function(err, user) {
			user[0].admin = req.user.username;
			user[0].save();
		});
		res.redirect('/');
	});
});

router.get('/removeOp', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(ADMIN) == 0 ||
			   user[0].role.localeCompare(HYBRID) == 0) {
				res.render('removeOp', { user : req.user.role, curVehicleOps: user[0].employeeIDs});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/removeOp', function(req, res, next) {
	Account.find({username: req.user.username}, function(err, user) {
		var i = user[0].employeeIDs.indexOf(req.body.username);
		user[0].employeeIDs.splice(i, 1);
		user[0].save();
		Account.find({username: req.body.username}, function(err, user) {
			user[0].admin = "";
			user[0].save();
		});
		res.redirect('/');
	});
});

router.get('/submitInspect', function(req, res, next) {
	if(req.user != undefined) {
		Account.find({username: req.user.username}, function(err, user) {
			if (err) throw err;
			if(user[0].role.localeCompare(ADMIN) == 0 ||
			   user[0].role.localeCompare(HYBRID) == 0) {
				res.render('submitInspect', { user : req.user.role});
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.post('/submitInspect', function(req, res, next) {
	
});

router.get('/reset', function(req, res) {
	Account.remove({}, function(error, result){});
	Pretrip.remove({}, function(error, result){});
	res.redirect('/');
});

router.get('/ping', function(req, res){
	res.status(200).send("pong!");
});

module.exports = router;
