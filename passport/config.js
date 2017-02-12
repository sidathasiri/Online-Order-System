var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');

var mysql = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : ''
});

connection.query('use restaurant');

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    connection.query("select * from users where id = "+id,function(err,rows){
        done(err, rows[0]);
    });
});

passport.use('local.signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {
        req.checkBody('email', 'Invalid email').notEmpty().isEmail();
        req.checkBody('password', 'Password too short').notEmpty().isLength({min:4});
        req.checkBody('name', 'Name should be given').notEmpty();
        var errors = req.validationErrors();
        if(errors){
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });

            return done(null, false, req.flash('error', messages));
        }

        connection.query("select * from users where email = '"+email+"'",function(err,rows){
            console.log(rows);
            console.log("above row object");
            if (err)
                return done(err);
            if (rows.length) {
                return done(null, false, {message: 'That email is already taken.'});
            } else {

                // if there is no user with that email
                // create the user
                var newUserMysql = new Object();

                newUserMysql.email    = email;

                var salt = bcrypt.genSaltSync(10);
                var hash = bcrypt.hashSync(password, salt);
                newUserMysql.password = hash; // use the generateHash function in our user model

               // var insertQuery = "INSERT INTO users ( email, password, post ) values ('" + email +"','"+ password +"','"+ password +"')";
               // console.log(insertQuery);
                connection.query('insert into users (email, password, post, name) values (?,?,?,?)',[email, hash, 'customer', req.body.name],function(err,rows){
                    newUserMysql.id = rows.insertId;

                    return done(null, newUserMysql);
                });
            }
        });
    }));

passport.use('local.signin', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form
        req.checkBody('email', 'Invalid email').notEmpty().isEmail();
        req.checkBody('password', 'Invalid password').notEmpty();
        var errors = req.validationErrors();
        if(errors){
            var messages = [];
            errors.forEach(function (error) {
                messages.push(error.msg);
            });

            return done(null, false, req.flash('error', messages));
        }

        connection.query("SELECT * FROM `users` WHERE `email` = '" + email + "'",function(err,rows){
            if (err)
                return done(err);
            if (!rows.length) {
                return done(null, false, {message: 'No user found.'}); // req.flash is the way to set flashdata using connect-flash
            }

            // if the user is found but the password is wrong
            console.log(bcrypt.compareSync(password, rows[0].password));
            if (!bcrypt.compareSync(password, rows[0].password))
                return done(null, false, {message: 'Oops! Wrong password.'}); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, rows[0]);

        });



    }));
