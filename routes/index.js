var express = require('express');
var router = express.Router();
var Cart = require('../Models/cart');
var dateTime = require('node-datetime');

/* GET home page. */
router.get('/', function(req, res, next) {
  var chunks = [];
  var successMsg = req.flash('success')[0];
  req.getConnection(function (err, conn){
    conn.query('select * from packages', function (err, packages) {

      for(var i=0; i<packages.length; i+=3){
        chunks.push(packages.slice(i, i+3));
      }
    });
  });
    res.render('index', { title: 'EasyFoods', packages: chunks, successMsg: successMsg , noMessage: !successMsg});
});

router.get('/burgers', function (req, res, next) {
  req.getConnection(function (err, conn) {
    conn.query('select id from categories where name = ?', ['Burgers'], function (err, id) {
      conn.query('select * from food_items where category_id = ? and availability = ?', [id[0].id, 'available'] ,function (err, burgers) {
        if(burgers){
          //set image path
            burgers.forEach(function (burger) {
               burger.image_path = burger.image_path.substr(7);
            });
          res.render('shop/burgers', { title: 'EasyFoods | Burgers', burgers: burgers});
        }
    });
  });
});
});

router.get('/snacks', function (req, res, next) {
  req.getConnection(function (err, conn) {
    conn.query('select id from categories where name = ?', ['Snacks'], function (err, id) {
      conn.query('select * from food_items where category_id = ? and availability = ?', [id[0].id, 'available'] ,function (err, snacks) {
        if(snacks){
            snacks.forEach(function (snack) {
                snack.image_path = snack.image_path.substr(7);
            });
          res.render('shop/snacks', {title: 'EasyFoods | Snacks', snacks: snacks});
        }
      });
    });
  });
});

router.get('/desserts', function (req, res, next) {
  req.getConnection(function (err, conn) {
    conn.query('select id from categories where name = ?', ['Desserts'], function (err, id) {
      conn.query('select * from food_items where category_id = ? and availability = ?', [id[0].id, 'available'] ,function (err, desserts) {
        if(desserts){
            desserts.forEach(function (dessert) {
                dessert.image_path = dessert.image_path.substr(7);
            });
          res.render('shop/desserts', {title: 'EasyFoods | Desserts', desserts: desserts});
        }
      });
    });
  });
});

router.get('/beverages', function (req, res, next) {
  req.getConnection(function (err, conn) {
    conn.query('select id from categories where name = ?', ['Beverages'], function (err, id) {
      conn.query('select * from food_items where category_id = ? and availability = ?', [id[0].id, 'available'] ,function (err, beverages) {
        if(beverages){
            beverages.forEach(function (beverage) {
                beverage.image_path = beverage.image_path.substr(7);
            });
          res.render('shop/beverages', {title: 'EasyFoods | Beverages', beverages: beverages});
        }
      });
    });
  });
});

router.get('/add-to-cart/:id/:type', function (req,res, next) {
  var packageId = req.params.id;
  var type = req.params.type;
  var cart = new Cart(req.session.cart ? req.session.cart: {});

  req.getConnection(function (err, conn){
    if(type=='package'){
      conn.query('select * from packages where id=?', [packageId], function(err, package){
        if(err){
          return res.redirect('/');
        }
        cart.add(package[0], package[0].id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/');

      });
    }
    else if(type == 'burger'){
      conn.query('select * from food_items where id=?', [packageId], function(err, package){
        if(err){
          return res.redirect('/');
        }
        cart.add(package[0], package[0].id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/burgers');

      });
    }

    else if(type == 'snack'){
      conn.query('select * from food_items where id=?', [packageId], function(err, package){
        if(err){
          return res.redirect('/');
        }
        cart.add(package[0], package[0].id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/snacks');

      });
    }

    else if(type == 'dessert'){
      conn.query('select * from food_items where id=?', [packageId], function(err, package){
        if(err){
          return res.redirect('/');
        }
        cart.add(package[0], package[0].id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/desserts');

      });
    }

    else if(type == 'beverage'){
      conn.query('select * from food_items where id=?', [packageId], function(err, package){
        if(err){
          return res.redirect('/');
        }
        cart.add(package[0], package[0].id);
        req.session.cart = cart;
        console.log(req.session.cart);
        res.redirect('/beverages');

      });
    }

  });
});

router.get('/reduce/:id', function (req, res, next) {
  var packageId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart: {});
  cart.reduceByOne(packageId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

router.get('/remove/:id', function (req, res, next) {
  var packageId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart: {});
  cart.removeItem(packageId);
  req.session.cart = cart;
  res.redirect('/shopping-cart');
});

router.get('/shopping-cart', function (req, res, next) {
  if(!req.session.cart){
    return res.render('shop/shopping-cart', { title: 'EasyFoods | Shopping Cart', packages: null});
  }

  var cart = new Cart(req.session.cart);
  res.render('shop/shopping-cart', {packages: cart.generateArray(), totalPrice: cart.totalPrice});
});

router.get('/checkout', isLoggedin,function (req, res, next) {
  if(!req.session.cart){
    return res.redirect('/shopping-cart');
  }
  var cart = new Cart(req.session.cart);
  var errMsg = req.flash('error')[0];
  res.render('shop/checkout', {title: 'EasyFoods | Checkout', total: cart.totalPrice, errMsg: errMsg, noError: !errMsg});

});

router.post('/checkout', isLoggedin,function(req, res, next){
  if(!req.session.cart){
    return res.redirect('/shopping-cart');
  }
  var cart = new Cart(req.session.cart);

  var stripe = require("stripe")(
      "sk_test_nS8RZkm3ZkpgdU9dvgBf5UGr"
  );

  stripe.charges.create({
    amount:  cart.totalPrice*100,
    currency: "lkr",
    source: req.body.stripeToken, // obtained with Stripe.js
    description: "Test Charge"
  }, function(err, charge) {
    if(err){
      req.flash('error', err.message);
      return res.redirect('/checkout');
    }
    var dt = dateTime.create();
    var formatted = dt.format('Y-m-d H:M:S');

    req.getConnection(function (err, conn) {
      //insert order to database
      conn.query('insert into orders (customer_id, cart,address, name, payment_id, date) values(?,?,?,?,?,?)', [req.user.id, JSON.stringify(cart),req.body.address, req.body.name, charge.id, formatted], function (err, result) {
        if(err){
          console.log('error', err);
          return res.redirect('/user/profile');
        }
        req.flash('success', 'Successfully completed!');

        var cartItems = cart.generateArray();

        req.session.cart = null;

        var api_key = 'key-a5c0a552c662ece5f3c279eec081b3f9';
        var domain = 'sandboxbd57df4272094073a1546c209403a45b.mailgun.org';
        var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

        var x = "";
        for(var i=0; i<cartItems.length; i++){
          x += '<tr><td style="border: 1px solid black; background-color: #e0faff;">'+ cartItems[i].item.name+'</td>'  + '  <td style="border: 1px solid black; background-color: #e0faff;">'+ cartItems[i].qty+'</td>'  + '  <td style="border: 1px solid black; background-color: #e0faff;">'+ cartItems[i].price+'</td></tr>'
        }

        var data = {
          from: 'EasyFoods <postmaster@sandboxbd57df4272094073a1546c209403a45b.mailgun.org>',
          to: req.user.email,
          subject: 'Order is placed',
          html: '<h1>You just placed an order on EasyFoods!</h1>' + '<table style="border: 1px solid black;"><thead style="font-weight: bold; background-color: #2cc5e8; color: white"><tr><td style="border: 1px solid black;">Item Name</td><td style="border: 1px solid black;">Quantity</td><td style="border: 1px solid black;">Price</td></tr></thead><tbody>' + x + '</tbody></table> <br> <p>Payment Id: '+charge.id+'</p><p>Date: ' +formatted+ '</p><hr><p>Thanks for using EasyFoods online services</p>'
        };

        mailgun.messages().send(data, function (error, body) {
          console.log(cartItems);
          res.redirect('/');
        });

      });
    });
  });
});

module.exports = router;

function isLoggedin(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  req.session.oldUrl = req.url;
  res.redirect('/user/signin');

}
