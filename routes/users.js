var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var Cart = require('../Models/cart');
var bcrypt = require('bcrypt-nodejs');

var csrfProtection = csrf();
router.use(csrfProtection);

//get signin page
router.get('/signin', function (req, res, next) {
  var messages = req.flash('error');
  //if user is logged in, redirect to profile page
  if(req.user){
      res.redirect('profile');
  }
  else{
      res.render('user/signin', {title: 'EasyFoods | Signin', csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
  }

});

//get signup page
router.get('/signup', function(req, res, next){
  var messages = req.flash('error');
  res.render('user/signup', {title: 'EasyFoods | Signup', csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
});

//get table reservation page
router.get('/reserveTable', isNormalUser,function (req, res, next) {
    var reserveSuccess = req.flash('reserveSuccess');
   res.render('user/reserve-table', {title: 'EasyFoods | Reserve Table', csrfToken: req.csrfToken(), reserveSuccess: reserveSuccess});
});

//get profile update page
router.get('/updateProfile', isNormalUser,function (req, res, next) {
    var updateSuccess = req.flash('updateSuccess');
    var updateError = req.flash('updateError');
    res.render('user/update-profile', {title: 'EasyFoods | Update Profile', csrfToken: req.csrfToken(), updateSuccess: updateSuccess, updateError: updateError});
});

//get profile page
router.get('/profile', isLoggedin,function (req, res, next) {
  req.getConnection(function (err, conn) {
    conn.query('select * from orders where customer_id = ?', [req.user.id], function(err, orders){
      var cart;
      //load items to cart
      orders.forEach(function(order){
        cart = new Cart(JSON.parse(order.cart));
        order.items = cart.generateArray();
        order.cart = JSON.parse(order.cart);
      });
      //respond to different types of users
      if(req.user.post=='customer')
        res.render('user/profile', {title: 'EasyFoods | Profile', orders: orders, name: req.user.name});

        if(req.user.post=='admin')
        res.redirect('/admin/adminDashboard');

        if(req.user.post=='delivery')
            res.redirect('/admin/deliveryDashboard');
    });
  });

});

//signup using passport
router.post('/signup', passport.authenticate('local.signup', {
  failureRedirect: '/user/signup',
  failureFlash: true
}), function (req, res, next){
  if(req.session.oldUrl){
    var oldUrl = req.session.oldUrl;
    req.session.oldUrl = null;
    res.redirect(oldUrl);

  }
  else{
    res.redirect('/user/profile');
  }
});

//signin using passport
router.post('/signin', passport.authenticate('local.signin', {
  failureRedirect: '/user/signin',
  failureFlash: true
}), function (req, res, next){
  if(req.session.oldUrl){
    var oldUrl = req.session.oldUrl;
    req.session.oldUrl = null;
    res.redirect(oldUrl);
  }
  else{
    if(req.user.post == 'customer')
       res.redirect('/user/profile');

    if(req.user.post == 'admin')
      res.redirect('/user/profile');

      if(req.user.post == 'delivery')
          res.redirect('/user/profile');
  }
});

router.get('/logout', isLoggedin,function (req, res, next) {
  req.logout();
  res.redirect('/user/signin');
});

//change email function
router.post('/changeEmail', isNormalUser,function (req, res, next) {
   var userId = req.user.id;
    if(req.body.email == ""){
        req.flash('updateError', 'Email should not be empty');
        res.redirect('/user/updateProfile');
    }
    else{
        req.getConnection(function (err, conn) {
            conn.query('update users set email = ? where id = ?', [req.body.email, userId], function (err, result) {
                req.flash('updateSuccess', 'Update Successfull');
                res.redirect('/user/updateProfile');
            });
        });
    }
});

//change password function
router.post('/changePassword', isLoggedin,function (req, res, next) {
   var userId = req.user.id;
   //validate data
    if(req.body.password == ""){
        req.flash('updateError', "Password should not be empty");
        res.redirect('/user/updateProfile');
        console.log('empty');
    }

    else if(req.body.password.length<4){
        req.flash('updateError', "Password too short");
        res.redirect('/user/updateProfile');
        console.log('too short');
    }

    else if(req.body.password != req.body.re_password){
        req.flash('updateError', "Passwords does not match");
        res.redirect('/user/updateProfile');
        console.log('match err');
    }

    else{
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(req.body.password, salt);    //hash password
        req.getConnection(function (err, conn) {
           conn.query('update users set password = ? where id = ?', [hash, userId], function (err, result) {
               req.flash('updateSuccess', "Passwords change successful!");
               res.redirect('/user/updateProfile');
           });
        });
    }
});

//load distinct capacity sizes from db
router.get('/loadCapacity', function (req, res, next) {
   req.getConnection(function (err, conn) {
     conn.query('select distinct capacity from tables order by capacity', function (err, capacities) {
         var capacitityArr = [];
         capacities.forEach(function (cap) {
            capacitityArr.push(cap.capacity);
         });
        res.send(capacitityArr);
     });
   });
});

//load tables with specific capacity
router.get('/loadTable/:capacity', function (req, res, next) {
   var capacity = req.params.capacity;
    req.getConnection(function (err, conn) {
       conn.query('select * from tables where capacity = ?', [capacity], function (err, tables) {
           var tableArr = [];
           tables.forEach(function (table) {
               tableArr.push(table);
           });
           res.send(tableArr);
       });
    });
});

//load price from specific item
router.get('/loadPrice/:id', function (req, res, next) {
    var id = req.params.id;
    req.getConnection(function (err, conn) {
        conn.query('select price from tables where table_no = ?', [id], function (err, price) {
            console.log(price);
            res.send(price);
        });
    });

});

//get available time slots
router.get('/loadTimeSolts/:tableId/:date', function (req, res, next) {
   var tableId = req.params.tableId;
    var timeSlotsArr = [];
    req.getConnection(function (err, conn) {
        conn.query('select time from time_slots', function (err, timeSlots) {
            timeSlots.forEach(function (timeSlot) {
                timeSlotsArr.push(timeSlot.time); //add all time slots
            });

            var timeIdArr = [];
            req.getConnection(function (err, conn) {
                console.log(tableId, req.params.date);
                conn.query('select time_slot_id from table_reservations where table_id = ?  and status = ? and date = ?', [tableId, 'active', req.params.date], function (err, timeIds) {
                    //check for active reservations
                    if(timeIds.length>0){
                        timeIds.forEach(function (id) {
                            timeIdArr.push(id.time_slot_id); //load taken time_slot ids
                        });

                        var takenSlots = [];
                        timeIdArr.forEach(function (id) {
                            req.getConnection(function (err, conn) {
                                conn.query('select time from time_slots where id = ?', [id], function (err, times) {
                                    times.forEach(function (slot) {
                                        takenSlots.push(slot.time); //get time for corresponding time_slot id
                                        console.log('takenSlots:'+takenSlots);
                                    });

                                    if(takenSlots.length==timeIds.length){
                                        let difference = timeSlotsArr.filter(x => takenSlots.indexOf(x) == -1); //take the difference of arrays
                                        console.log(difference);
                                        res.send(difference);
                                    }

                                });
                            });
                        });
                        //if no active reservations
                    }else{
                        console.log('in not found results');
                        res.send(timeSlotsArr);
                    }
                });
            });
        });
    });
});

//make the reservation
router.post('/reserve', isNormalUser,function (req, res,next) {
    var time_slot = req.body.slots;
    req.getConnection(function (err, conn) {
       conn.query('select id from time_slots where time = ?', [time_slot], function (err, ids) {
           req.getConnection(function (err, conn) {
               //create the date
               var date = new Date();

               var hour = date.getHours();
               hour = (hour < 10 ? "0" : "") + hour;

               var min  = date.getMinutes();
               min = (min < 10 ? "0" : "") + min;

               var sec  = date.getSeconds();
               sec = (sec < 10 ? "0" : "") + sec;

               var year = date.getFullYear();

               var month = date.getMonth() + 1;
               month = (month < 10 ? "0" : "") + month;

               var day  = date.getDate();
               day = (day < 10 ? "0" : "") + day;

               var currentTime = year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;
               //make db entry
               conn.query('insert into table_reservations (table_id, time_slot_id, user_id, status, createdOn, date) values(?,?,?,?,?,?)', [req.body.tableData, ids[0].id, req.user.id, 'active', currentTime, req.body.date]);
               req.flash('reserveSuccess', 'Reservation Successful!');
               res.redirect('/user/reserveTable');
           });
       });
    });

});

//load user reservations
router.get('/myReservations', isLoggedin,function (req, res, next) {
    var reservationArr = [];
    req.getConnection(function (err, conn) {
       conn.query('select * from table_reservations where user_id = ? and status = ?', [req.user.id, 'active'], function (err, reservations) {
           if(reservations.length>0){
               reservations.forEach(function (reservation) {
                   var temp = [];
                   temp.push(reservation.table_id);
                   req.getConnection(function (err, conn) {
                       conn.query('select time from time_slots where id = ?', [reservation.time_slot_id], function (err, times) {
                           temp.push(times[0].time);
                           temp.push(reservation.createdOn);
                           temp.push(reservation.id);
                           temp.push(reservation.date);
                           reservationArr.push(temp);
                           if(reservationArr.length==reservations.length){
                               res.render('user/my-reservations', {title: 'EasyFoods | My Reservations', reservations: reservationArr, isAvailable: reservations.length>0});
                           }
                       });

                   });
               });
           }else{
               res.render('user/my-reservations', {title: 'EasyFoods | My Reservations'});
           }

       });
    });
});

//cancel reservation function
router.get('/cancelReservation/:id', isLoggedin,function (req, res,next) {
   var id = req.params.id;
    req.getConnection(function (err, conn) {
        conn.query('update table_reservations set status = ? where id = ?', ['finished', id], function () {
            res.send(id);
        });
    });
});

//load image of table
router.get('/loadTableImage/:id', function (req, res, next) {
   var table_id = req.params.id;
    req.getConnection(function (err, conn) {
       conn.query('select image_path from tables where table_no = ?', [table_id], function (err, paths) {
         res.send(paths[0].image_path);
       });
    });
});

//change user address
router.post('/changeAddress', isLoggedin,function (req, res, next) {
    var userId = req.user.id;

    //validate input
    if(req.body.address == ""){
        req.flash('updateError', "Address should not be empty");
        res.redirect('/user/updateProfile');
        console.log('empty address');
    }
    //no errors => make the update
    else{
        req.getConnection(function (err, conn) {
            conn.query('update users set address = ? where id = ?', [req.body.address, userId], function (err, result) {
                if(!err){
                    req.flash('updateSuccess', "Updated address successfully!");
                    res.redirect('/user/updateProfile');
                }
            });
        });
    }

});

//load user data
router.get('/loadUserData', function (req, res, next) {
    var userId = req.user.id;

    req.getConnection(function (err, conn) {
       conn.query('select name, address from users where id = ?', [userId], function (err, data) {
          res.send({name: data[0].name, address: data[0].address});
       });
    });
});

//validate user email
router.get('/isValidUser/:email', function (req, res, next) {
   var checkingEmail = req.params.email;
   req.getConnection(function (err, conn) {
       conn.query('select * from users where email = ?', [checkingEmail], function (err, result) {
          if(result.length>0)
              res.send(true);

          else
              res.send(false);
       });
   });
});

router.get('/checkReservationDate/:date', function (req, res, next) {
    var enteredDate = new Date(req.params.date);
    var currentDate = new Date();

    if(currentDate.getDate()<=enteredDate.getDate() && currentDate.getMonth()<=enteredDate.getMonth()){
        res.send(true);
    }
    else
        res.send(false);
});

module.exports = router;

//check if a user has logged in
function isLoggedin(req, res, next){
  if(req.user){
    return next();
  }
  res.redirect('/user/signin');
}

//check if a customer has logged in
function isNormalUser(req, res, next){
    if(req.user){
        if(req.user.post == 'customer')
            return next();
    }
    res.redirect('/user/signin');
}


