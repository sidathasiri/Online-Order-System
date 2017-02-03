var express = require('express');
var router = express.Router();
var csrf = require('csurf');
var passport = require('passport');
var Cart = require('../Models/cart');

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
            })
            var messages = req.flash('addCat');
            console.log(messages[0]);
            res.render('admin/addFood', {names: names, csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0});
        });
    });

});

router.get('/setAvailableFood', function (req, res, next) {
    res.render('admin/setAvailableFood');
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



module.exports = router;

function isLoggedin(req, res, next){
    if(req.user){
        return next();
    }
    res.redirect('/user/signin');
}
