var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var Cart = require('../Models/cart');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

var csrfProtection = csrf();
router.use(csrfProtection);

router.get('/adminDashboard', function (req, res, next) {
    req.getConnection(function (err, conn) {
        conn.query('select * from orders where status = ?', ['pending'],function(err, orders){
            var cart;
            orders.forEach(function(order){
                cart = new Cart(JSON.parse(order.cart));
                order.items = cart.generateArray();
                order.cart = JSON.parse(order.cart);
            });
            res.render('admin/adminDashboard', {orders: orders});
        });
    });

});

router.get('/addFood', function (req, res, next) {
    var names = [];
    req.getConnection(function (err, conn) {
        conn.query('select name from categories', function (err, categories) {
            categories.forEach(function (category) {
                names.push(category);
            });
            var messages = req.flash('addCat');
            var errors = req.flash('error');
            console.log(messages[0]);
            res.render('admin/addFood', {names: names, csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0, errors: errors, hasValidationErrors: errors.length>0});
        });
    });

});

router.get('/setAvailableFood', function (req, res, next) {
    req.getConnection(function (err, conn) {
       conn.query('select * from categories', function (err, names) {
           conn.query('select * from food_items where category_id = ?', [1], function (err, items) {
               res.render('admin/setAvailableFood', {names: names, items:items,  csrfToken: req.csrfToken()});
           });

       });
    });

});

router.get('/myOrders', function(req, res, next){
    req.getConnection(function (err, conn) {
        conn.query('select * from orders where customer_id = ?', [req.user.id], function(err, orders){
            var cart;
            orders.forEach(function(order){
                cart = new Cart(JSON.parse(order.cart));
                order.items = cart.generateArray();
                order.cart = JSON.parse(order.cart);
            });
            res.render('admin/myOrders', {orders: orders});
        });
    });
});

router.post('/addNewCategory', function (req, res, next) {
   var catName = req.body.categoryName;
    req.getConnection(function (err, conn) {
       conn.query('select name from categories where name = ?', [catName], function (err, result) {
          if(result.length==0){
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

router.post('/addNewFood', upload.single('fileUpload'),function (req, res, next) {
    req.checkBody('itemName', 'Item name should not be empty').notEmpty();
    req.checkBody('price', 'Price is invalid').notEmpty().isNumeric();

    var errors = req.validationErrors();
    if(errors){
        var messages = [];
        errors.forEach(function (error) {
            messages.push(error.msg);
        });

        req.flash('error', messages);
        res.redirect('/admin/addFood');
    }

    else{
        var catName = req.body.category;
        req.getConnection(function (err, conn) {
            conn.query('select id from categories where name = ?', [catName], function (err, id) {
                conn.query('insert into food_items (name, price, category_id) values(?,?,?)', [req.body.itemName, req.body.price, id[0].id], function (err, result) {
                    res.redirect('/admin/addFood');
                });
            });
        });
    }

});

router.get('/loadItems/:id', function (req, res, next) {
    var catId = req.params.id;
    req.getConnection(function (err, conn) {
        conn.query('select * from food_items where category_id = ?', [catId],function (err, names) {
            res.send(names);
        });
    });
});

router.post('/update', function (req, res, next) {
    var availability = req.body.optradio;
    var itemId = req.body.items;
    var price = req.body.price;
    req.getConnection(function (err, conn) {
       conn.query('update food_items set price = ?, availability = ? where id = ?', [price, availability, itemId], function (err, result) {
          res.redirect('/admin/setAvailableFood');
       });
    });
});

router.get('/getPrice/:id', function (req, res, next) {
   req.getConnection(function (err, conn) {
      conn.query('select price from food_items where id = ?', [req.params.id], function (err, price) {
          res.send(price[0]);
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
