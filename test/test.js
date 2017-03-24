var assert = require('assert');

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'restaurant'
});

describe('Getting categories', function() {
    describe('async module', function() {
        it('should return category for given id', function(done) {
            connection.connect();
            connection.query("select name from categories where id = ?", [1], function (err, names) {
                if(err){
                    done(err);
                 //   connection.end();
                    return;
                }

                else{
                    assert.equal(names[0].name, "Burgers");
               //     connection.end();
                    done();
                }
            });
        });
    });
});

describe('Getting food items', function() {
    describe('async module', function() {
        it('should return food items for given id', function(done) {

            connection.query('select name from food_items where category_id = ?', [3],function (err, items) {
                if(err){
                    done(err);
                    return;
                }
                assert.equal(items.length, 3);
                assert.equal(items[0].name, "Fries");
                assert.equal(items[1].name,  "Apple Slices");
                assert.equal(items[2].name, "Cuties");
                done();
            });
        });
    });
});

describe('Getting food price', function() {
    describe('async module', function() {
        it('should return price of food items for given id', function(done) {

            connection.query('select price from food_items where id = ?', [1],function (err, items) {
                if(err){
                    done(err);
                    return;
                }
                assert.equal(items[0].price, 110);
                done();
            });
        });
    });
});

describe('Getting tables for given capacity', function() {
    describe('async module', function() {
        it('should return table id for given capacity', function(done) {

            connection.query('select table_no from tables where capacity = ?', [2], function (err, tables) {
                if(err){
                    done(err);
                    return;
                }

                else{
                    assert.equal(tables.length, 2);
                    assert.equal(tables[0].table_no, 1);
                    assert.equal(tables[1].table_no, 6);
                    done();
                    connection.end();
                }
            });
        });
    });
});
