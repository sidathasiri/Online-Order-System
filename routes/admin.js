var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var Cart = require('../Models/cart');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var bodyParser = require('body-parser');
var request = require('request');

//multrer configuration
var storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }
});

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(multer({storage: storage}).single('fileUpload'));

var csrfProtection = csrf();
router.use(csrfProtection);

router.get('/adminDashboard', isLoggedin,function (req, res, next) {
    req.getConnection(function (err, conn) {
        //get orders from database
        conn.query('select * from orders where status = ?', ['pending'],function(err, orders){
            var cart;
            orders.forEach(function(order){
                cart = new Cart(JSON.parse(order.cart));
                order.items = cart.generateArray();
                order.cart = JSON.parse(order.cart);
            });
            console.log(req.csrfToken());
            res.render('admin/adminDashboard', { title: 'EasyFoods | Admin | Orders', orders: orders});
        });
    });

});

router.get('/deliveryDashboard', isDeliveryLoggedin,function (req, res, next) {
    req.getConnection(function (err, conn) {
        //get orders from database
        conn.query('select * from orders where status = ?', ['pending'],function(err, orders){
            var cart;
            orders.forEach(function(order){
                cart = new Cart(JSON.parse(order.cart));
                order.items = cart.generateArray();
                order.cart = JSON.parse(order.cart);
            });
            console.log(req.csrfToken());
            res.render('admin/delivery-dashboard', { title: 'EasyFoods | Delivery | Orders', orders: orders});
        });
    });

});


router.get('/addFood', isLoggedin,function (req, res, next) {
    var names = [];
    req.getConnection(function (err, conn) {
        //load categories
        conn.query('select name from categories', function (err, categories) {
            categories.forEach(function (category) {
                names.push(category);
            });
            var messages = req.flash('addCat');
            var errors = req.flash('error');
            res.render('admin/addFood', { title: 'EasyFoods | Admin | Add Food', names: names, csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0, errors: errors, hasValidationErrors: errors.length>0});
        });
    });

});

router.get('/setAvailableFood', isLoggedin,function (req, res, next) {
    req.getConnection(function (err, conn) {
        //load categories
       conn.query('select * from categories', function (err, names) {
           conn.query('select * from food_items where category_id = ?', [1], function (err, items) {
               res.render('admin/setAvailableFood', { title: 'EasyFoods | Admin | Set Food', names: names, items:items,  csrfToken: req.csrfToken()});
           });

       });
    });

});

router.get('/myOrders', isLoggedin,function(req, res, next){
    req.getConnection(function (err, conn) {
        conn.query('select * from orders where customer_id = ?', [req.user.id], function(err, orders){
            var cart;
            //update cart
            orders.forEach(function(order){
                cart = new Cart(JSON.parse(order.cart));
                order.items = cart.generateArray();
                order.cart = JSON.parse(order.cart);
            });
            res.render('admin/myOrders', { title: 'EasyFoods | Admin | My Orders', orders: orders});
        });
    });
});

router.post('/addNewCategory', isLoggedin,function (req, res, next) {
   var catName = req.body.categoryName;
    req.getConnection(function (err, conn) {
        //load name from database
       conn.query('select name from categories where name = ?', [catName], function (err, result) {
          if(result.length==0){
              //insert to cartegories
              conn.query('insert into categories (name) values(?)', [catName], function (err, result) {
                  req.flash('addCat', 'Added Successfully');
                  res.redirect('/admin/addFood');
              });
          }

          else{
              req.flash('addCat', 'Already exists!');
              res.redirect('/admin/addFood');
          }
       });
    });
});

router.post('/addNewFood', isLoggedin,function (req, res, next) {
    req.checkBody('itemName', 'Item name should not be empty').notEmpty();
    req.checkBody('price', 'Price is invalid').notEmpty().isNumeric();

    //check errors
    var errors = req.validationErrors();
    if(errors){
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        });

        req.flash('error', messages);
        res.redirect('/admin/addFood');
    }
    //if not errors add data
    else{
        var catName = req.body.category;
        req.getConnection(function (err, conn) {
            conn.query('select id from categories where name = ?', [catName], function (err, id) {
                //insert food item to database
                conn.query('insert into food_items (name, price, category_id, image_path) values(?,?,?,?)', [req.body.itemName, req.body.price, id[0].id, req.file.path], function (err, result) {
                    if(err)
                        console.log(err);
                    res.redirect('/admin/addFood');
                });
            });
        });
    }
});

router.get('/loadItems/:id', function (req, res, next) {
    var catId = req.params.id;
    //load food_item with given id
    req.getConnection(function (err, conn) {
        conn.query('select * from food_items where category_id = ?', [catId],function (err, names) {
            res.send(names);
        });
    });
});

router.post('/update', isLoggedin,function (req, res, next) {
    var availability = req.body.optradio;
    var itemId = req.body.items;
    var price = req.body.price;
    req.getConnection(function (err, conn) {
        //update price
       conn.query('update food_items set price = ?, availability = ? where id = ?', [price, availability, itemId], function (err, result) {
          res.redirect('/admin/setAvailableFood');
       });
    });
});

router.get('/getPrice/:id', function (req, res, next) {
   req.getConnection(function (err, conn) {
      conn.query('select price from food_items where id = ?', [req.params.id], function (err, price) {
          //send price of given id
          res.send(price[0]);
      });
   });
});

router.get('/sendCompletedMail/:customer_id/:id', function (req, res, next) {

    //setup mailgun
    var customer_id = req.params.customer_id;
    var order_id = req.params.id;
    var api_key = 'key-a5c0a552c662ece5f3c279eec081b3f9';
    var domain = 'sandboxbd57df4272094073a1546c209403a45b.mailgun.org';
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

    req.getConnection(function (err, conn) {
       conn.query('select email from users where id=?', [customer_id], function (err, email) {
            //setting up headers
           var data = {
               from: 'EasyFoods <postmaster@sandboxbd57df4272094073a1546c209403a45b.mailgun.org>',
               to: email[0].email,
               subject: 'Order is on the way',
               text: 'We just shipped your order and will reach you soon. Thanks for using our web app!'
           };
                //sending mail
               mailgun.messages().send(data, function (error, body) {
               req.getConnection(function (err, conn) {
                  conn.query('update orders set status = ? where id = ?', ['finished', order_id], function (err, result) {
                      if(req.user.post == 'admin')
                          res.redirect('/admin/adminDashboard');
                      else if(req.user.post == 'delivery')
                          res.redirect('/admin/deliveryDashboard');
                  });
               });

           });
       });
    });

});

router.get('/tableReservations', isLoggedin,function (req, res,next) {
    var reservationsArr = [];
    req.getConnection(function (err, conn) {
        //load active reservations from db
       conn.query('select * from table_reservations where status = ?', ['active'], function (err ,reservations) {
           console.log(reservations);
          if(reservations.length>0){
              reservations.forEach(function (reservation) {
                  var temp = [];
                  //load available time slots
                  temp.push(reservation.table_id);
                  temp.push(reservation.createdOn);
                  console.log(reservation.time_slot_id);
                  req.getConnection(function (err, conn) {
                      conn.query('select time from time_slots where id = ?', reservation.time_slot_id, function (err, times) {
                          console.log(times);
                          temp.push(times[0].time);
                          req.getConnection(function (err, conn) {
                              conn.query('select name from users where id = ?', [reservation.user_id], function (err, names) {
                                  temp.push(names[0].name);
                                  temp.push(reservation.id);
                                  temp.push(reservation.date);
                                  reservationsArr.push(temp);
                                  if(reservationsArr.length==reservations.length){
                                      console.log(reservationsArr);
                                      res.render('admin/table-reservations', { title: 'EasyFoods | Admin | Table Reservation', reservations: reservationsArr, isAvailable: reservationsArr.length>0});
                                  }
                              });
                          });
                      });
                  });
              });
          }else{
              res.render('admin/table-reservations', {title: 'EasyFoods | Admin | Table Reservation'});
          }
       });
    });

});

router.get('/addTable', isLoggedin,function (req, res, next) {
    var errors = req.flash('error');
    var success = req.flash('success');
   res.render('admin/addTable', {csrfToken: req.csrfToken(), errors: errors, hasValidationErrors: errors.length>0, success:success});
});

router.post('/addNewTable', isLoggedin,function (req, res, next) {
    req.checkBody('capacity', 'Capacity is invalid').notEmpty().isInt();
    req.checkBody('price', 'Price is invalid').notEmpty().isNumeric();

    //validation for errors
    var errors = req.validationErrors();
    if(errors){
        var messages = [];
        errors.forEach(function (error) {
            if(messages.indexOf(error.msg) <=-1)
                messages.push(error.msg);
        });

        req.flash('error', messages);
        console.log('in validation error: '+ messages);
        res.redirect('/admin/addTable');
    }

    //if no error add data to db
    else{
        req.getConnection(function (err, conn) {
            conn.query('insert into tables (capacity, price, image_path) values(?,?,?)', [req.body.capacity, req.body.price, req.file.path.substr(6)], function (err, result) {
                if(err)
                    console.log(err);
                req.flash('success', 'Added successfully!');
                res.redirect('/admin/addTable');
            });

        });
    }
});

router.get('/report', isLoggedin,function (req, res, next) {

    //setup reporting properties
    var data = {
        template: {'shortid': 'H1gb6hVhx', "recipe" : "phantom-pdf"},
        options: {
            preview: true,
            "Content-Disposition": "attachment; filename=myreport.pdf"
        }
    }

    //setting report options
    var options = {
        uri: "http://localhost:3001/api/report",
        method: 'POST',
        json: data
    }

    request(options).pipe(res);
});



module.exports = router;

function isLoggedin(req, res, next){
    if(req.user){
        if(req.user.post == 'admin')
            return next();
    }
    res.redirect('/user/signin');
}

function isDeliveryLoggedin(req, res, next){
    if(req.user){
        if(req.user.post == 'delivery')
            return next();
    }
    res.redirect('/user/signin');
}
