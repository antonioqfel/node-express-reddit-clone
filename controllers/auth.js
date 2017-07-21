'use strict';

var express = require('express');
// Load the parser library
var bodyParser = require('body-parser');

// Load the cookie-parser library. It parses cookie from Cookie request header into an object
var cookieParser = require('cookie-parser');

// Create application/json parser
var jsonParser = bodyParser.json();

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });



module.exports = function(myReddit) {

    var authController = express.Router();
    
    authController.get('/login', function(request, response) {

        if(request.cookies.SESSION) {
            console.log('You are already logged in');
            response.redirect('/');
        }
        else {
            response.render('login-form');
        }

    });

    
    authController.post('/login', urlencodedParser, function(request, response) {

        myReddit.checkUserLogin(request.body.username, request.body.password)
            .then(result => {

               // The random token
                return myReddit.createUserSession(result.id)
            })
            .then(result => {
                authController.use(cookieParser());
                response.cookie('SESSION', result);
                console.log('You have successfully logged in');
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

    // For logging out
    authController.get('/logout', function(request, response) {
        response.locals.loggedOutUser = true;
        response.render('logout-form');
    });

    authController.post('/logout', function (request, response) {

        myReddit.deleteSessionFromToken(request.cookies.SESSION)
            .then(result => {
                response.clearCookie("SESSION"); // Delete the cookie
                response.locals.loggedOutUser = false;
                response.redirect('/');
            })

    });
    
    return authController;
}