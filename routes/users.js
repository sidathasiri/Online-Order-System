var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var Cart = require('../Models/cart');

var csrfProtection = csrf();
router.use(csrfProtection);

/* GET users listing. */
router.get('/signin', function (req, res, next) {
  var messages = req.flash('error');
  res.render('user/signin', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});

});

router.get('/signup', function(req, res, next){
  var messages = req.flash('error');
  res.render('user/signup', {csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
});

router.get('/reserveTable', isLoggedin,function (req, res, next) {
   res.render('user/reserve-table');
});

router.get('/updateProfile', isLoggedin,function (req, res, next) {
    var updateSuccess = req.flash('updateSuccess');
    var updateError = req.flash('updateError');
    res.render('user/update-profile', {csrfToken: req.csrfToken(), updateSuccess: updateSuccess, updateError: updateError});
});

router.get('/profile', isLoggedin,function (req, res, next) {
  req.getConnection(function (err, conn) {
    conn.query('select * from orders where customer_id = ?', [req.user.id], function(err, orders){
      var cart;
      orders.forEach(function(order){
        cart = new Cart(JSON.parse(order.cart));
        order.items = cart.generateArray();
        order.cart = JSON.parse(order.cart);
      });
      if(req.user.post=='customer')
        res.render('user/profile', {orders: orders, name: req.user.name});
      else
        res.redirect('/admin/adminDashboard');
    });
  });

});

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
  }
});

router.get('/logout', isLoggedin,function (req, res, next) {
  req.logout();
  res.redirect('/user/signin');
});

router.post('/changeEmail', function (req, res, next) {
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

router.get('/loadCapacity', function (req, res, next) {
   req.getConnection(function (err, conn) {
     conn.query('select distinct capacity from tables', function (err, capacities) {
         var capacitityArr = [];
         capacities.forEach(function (cap) {
            capacitityArr.push(cap.capacity);
         });
        res.send(capacitityArr);
     });
   });
});

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

router.get('/loadPrice/:id', function (req, res, next) {
    var id = req.params.id;
    req.getConnection(function (err, conn) {
        conn.query('select price from tables where table_no = ?', [id], function (err, price) {
            console.log(price);
            res.send(price);
        });
    });

});

router.get('/loadTimeSolts/:tableId', function (req, res, next) {
   var tableId = req.params.tableId;
    var timeSlotsArr = [];
    req.getConnection(function (err, conn) {
        conn.query('select time from time_slots', function (err, timeSlots) {
            timeSlots.forEach(function (timeSlot) {
                timeSlotsArr.push(timeSlot.time);
            });

            var timeIdArr = [];
            req.getConnection(function (err, conn) {
                conn.query('select time_slot_id from table_reservations where table_id = ?  and status = ?', [tableId, 'active'], function (err, timeIds) {
                    if(timeIds.length>0){
                        timeIds.forEach(function (id) {
                            timeIdArr.push(id.time_slot_id);
                        });

                        var takenSlots = [];
                        timeIdArr.forEach(function (id) {
                            req.getConnection(function (err, conn) {
                                conn.query('select time from time_slots where id = ?', [id], function (err, times) {
                                    times.forEach(function (slot) {
                                        takenSlots.push(slot.time);
                                    });

                                    if(takenSlots.length==timeIds.length){
                                        let difference = timeSlotsArr.filter(x => takenSlots.indexOf(x) == -1);
                                        console.log(difference);
                                        res.send(difference);
                                    }

                                });
                            });
                        });
                    }else{
                        res.send(timeSlotsArr);
                    }
                });
            });




        });







    });



});

module.exports = router;

function isLoggedin(req, res, next){
  if(req.user){
    return next();
  }
  res.redirect('/user/signin');
}
