'use strict';

var express = require('express');
// load the parser library
var bodyParser = require('body-parser');

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });



module.exports = function(myReddit) {
    var authController = express.Router();
    
    authController.get('/login', function(request, response) {
        response.render('login-form');
    });
    
    authController.post('/login', urlencodedParser, function(request, response) {

        myReddit.checkUserLogin(request.body.username, request.body.password)
            .then(result => {
                console.log('You have successfully logged in' );
                response.redirect('/');
            })
            .catch(error => {
                console.log('The error is: ', error);
            })






    });
    
    authController.get('/signup', function(request, response) {
        response.render('signup-form');
    });

    authController.post('/signup', urlencodedParser, function (request, response) {
        if (!request.body) {
            return response.sendStatus(400);
        }
        else {

            myReddit.createUser({
                username: request.body.username,
                password: request.body.password
            })
            .catch(error => {
                response.redirect('/auth/error');
            });

            response.redirect('/auth/login');
        }
    });

    authController.get('/error', function(request, response) {
        response.render('error');
    });
    
    return authController;
}

/*
authController.post('/signup', function(request, response) {
    *****
});
*/