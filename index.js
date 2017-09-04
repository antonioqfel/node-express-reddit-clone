'user strict';

var express = require('express');
var mysql = require('promise-mysql');

var emoji = require('node-emoji');

// Express middleware
var bodyParser = require('body-parser'); // reads request bodies from POST requests
var cookieParser = require('cookie-parser'); // parses cookie from Cookie request header into an object
var morgan = require('morgan'); // logs every request on the console
var checkLoginToken = require('./lib/check-login-token.js'); // checks if cookie has a SESSION token and sets request.user
var onlyLoggedIn = require('./lib/only-logged-in.js'); // only allows requests from logged in users

// Controllers
var authController = require('./controllers/auth.js');

/*
 Load the RedditAPI class and create an API with db connection. This connection will stay open as
 long as the web server is running, which is 24/7.
 */
var RedditAPI = require('./lib/reddit.js');
// var connection = mysql.createPool({
//     host: 'localhost',
//     user: 'root', // CHANGE THIS :)
//     password: 'admin',
//     database: 'reddit',
//     connectionLimit: 10
// });
var connection = mysql.createPool({
    host: 'us-cdbr-iron-east-05.cleardb.net',
    user: 'b575a0f1bebbae', // CHANGE THIS :)
    password: 'a037e52f',
    database: 'heroku_554c09a6b5aac20',
    connectionLimit: 10
});
var myReddit = new RedditAPI(connection);

// Create a new Express web server
var app = express();

// Specify the usage of the Pug template engine
app.set('view engine', 'pug');

// Serving static files in Express
app.use('/static', express.static('static_files'));

/*
 This next section specifies the middleware we want to run.
 app.use takes a callback function that will be called on every request
 the callback function will receive the request object, the response object, and a next callback.
 this type of function is called a "middleware".
 express will run these middleware in a pipeline, one after the other on each request.
 the order the middleware are declared in is important. for example, the cookieParser middleware will
 add a .cookie property to the request object. the checkLoginToken middleware will then use request.cookie
 to check if a user is logged in. this means cookieParser needs to run before checkLoginToken.
 */

// This middleware will log every request made to your web server on the console.
app.use(morgan('dev'));

// This middleware will parse the POST requests coming from an HTML form, and put the result in request.body.
app.use(bodyParser.urlencoded({extended: false}));

// This middleware will parse the Cookie header from all requests, and put the result in request.cookies as an object.
app.use(cookieParser());

/*
This custom middleware checks in the cookies if there is a SESSION token and validates it.

NOTE: This middleware is currently commented out! Uncomment it once you've implemented the RedditAPI
method `getUserFromSession`
 */
app.use(checkLoginToken(myReddit));


/*
app.use can also take a path prefix as a parameter. the next app.use says that anytime the request URL
starts with /auth, the middleware exported by controllers/auth.js should be called.

this type of middleware is a common way to modularize code in an Express application. basicaly we're
saying that any URL under /auth has to do with authentication, and we put all the sub-routes in their
own file to prevent clutter and improve maintainability.

the file at controllers/auth.js contains what is called an Express Router. a Router is like a tiny
express application that takes care of its own set of paths. look at the file for more information.

The authController needs access to the RedditAPI to do its work, so we pass it as a parameter and the
controller gets returned from that function.
 */
app.use('/auth', authController(myReddit));

/* This next middleware will allow us to serve static files, as if our web server was a file server.
 To do this, we attach the middleware to the /static URL path. This means any URL that starts with
 /static will go thru this middleware. We setup the static middleware to look for files under the public
 directory which is at the root of the project. This basically "links" the public directory to a URL
 path called /static, and any files under /public can be requested by asking for them with /static
 followed by the path of those files.

 If you look in views/layout.pug, you'll see that we add a <link> tag referencing /static/app.css.
 This is a CSS file that is located in the public directory. For now the file is mostly empty, but
 you can add stuff to it if you want to make your site look better.

 Eventually you could also load browser JavaScript and make your site more dynamic. We will be looking
 at how to do this in the next few weeks but don't hesitate to take a head start.
 */
app.use('/static', express.static(__dirname + '/public'));

// Regular home Page
app.get('/', function (request, response) {

    response.locals.isSubreddit = false;

    myReddit.getAllPosts()
        .then(function (posts) {
            response.render('homepage', {posts: posts});
        })
        .catch(function (error) {
            response.render('error', {error: error});
        })
});

// Listing of subreddits
app.get('/subreddits', function (request, response) {
    /*
    1. Get all subreddits with RedditAPI
    2. Render some HTML that lists all the subreddits
     */

    response.send("TO BE IMPLEMENTED");
});

// Subreddit homepage, similar to the regular home page but filtered by sub.
app.get('/r/:subreddit', function (request, response) {

    return myReddit.getSubredditByName(request.params.subreddit)

        .then(result => {
            if (result === null) {
                response.sendStatus(404);
            }
            else {
                response.locals.isSubreddit = result;
                console.log(result);
                return result;
            }
        })
        .then(result => {

            return myReddit.getAllPosts(result)

                .then(function (posts) {
                    console.log('my result is:' + posts);
                    response.render('homepage', {posts: posts});
                })
                .catch(function (error) {
                    response.render('error', {error: error});
                })
        })
});

// Sorted home page
app.get('/sort/:method', function (request, response) {

    return Promise.resolve()
        .then(result => {

            if (request.params.method !== 'hot' && request.params.method !== 'top') {

                response.status(404);
            }
            else {

                var obj = {
                    sortingMethod: request.params.method
                }

                return obj;
            }
        })
        .then(method => {

            myReddit.getAllPosts(method)

                .then(function (posts) {
                    response.render('homepage', {posts: posts});
                })
                .catch(function (error) {
                    response.render('error', {error: error});
                });
        })
});

app.get('/post/:postId', function (request, response) {


    console.log(request.params.postId);

    Promise.all([myReddit.getSinglePost(request.params.postId), myReddit.getCommentsForPost(request.params.postId)])
        .then(result => {
            // console.log('first result:');
            // console.log(result[0]);
            // console.log('second result');
            console.log(result[1]);
            console.log(emoji.emojify('I :heart: :coffee:!'));


            // Loop thru the array to emojify text
            for (var i = 0; i < result[1].length; i++) {

                result[1][i].text = emoji.emojify(result[1][i].text);

            }

            response.render('single-post', {post: result[0], comments: result[1]});
        })


    //getSinglePost(postId)
    //getCommentsForPost(postId)

});

/*
This is a POST endpoint. It will be called when a form is submitted with method="POST" action="/vote"
The goal of this endpoint is to receive an up/down vote by a logged in user.
Since you can only vote if you are logged in, the onlyLoggedIn middleware is interposed before the final request handler.
The app.* methods of express can actually take multiple middleware, forming a chain that is only used for that path

This basically says: if there is a POST /vote request, first pass it thru the onlyLoggedIn middleware. If that
middleware calls next(), then also pass it to the final request handler specified.
 */
app.post('/vote', onlyLoggedIn, function (request, response) {


    var myVote = {
        postId: request.body.postId,
        userId: request.loggedInUser.userId,
        voteDirection: parseInt(request.body.vote)
    }

    console.log(myVote);

    return myReddit.createVote(myVote)
        .then(result => {
            response.send("Thank your for your vote!");
        })
});

// This handler will send out an HTML form for creating a new post
app.get('/createPost', onlyLoggedIn, function (request, response) {

    return myReddit.getAllSubreddits()
        .then(allSubreddits => {
            response.render('create-post-form', {subreddits: allSubreddits});
        })

});

// POST handler for form submissions creating a new post
app.post('/createPost', onlyLoggedIn, function (request, response) {

    console.log('My user id: ', request.loggedInUser.userId)

    var myPost = {
        userId: request.loggedInUser.userId,
        title: request.body.title,
        url: request.body.url,
        subredditId: request.body.subredditId
    }

    return myReddit.createPost(myPost)
        .then(result => {

            response.redirect(`/post/${result}`);
        });

});


app.post('/createComment', onlyLoggedIn, function (request, response) {
    console.log('Outside');

    return myReddit.luke()
        .then(result => {
            console.log('Inside', result);
            response.redirect(`/post/${request.body.postId}`);
        }).catch(error => {
            console.log(error);
            response.send(error);
        })
});


// Listen
/*
var port = process.env.PORT || 3000;
app.listen(port, function() {
    // This part will only work with Cloud9, and is meant to help you find the URL of your web server :)
    if (process.env.C9_HOSTNAME) {
        console.log('Web server is listening on https://' + process.env.C9_HOSTNAME);
    }
    else {
        console.log('Web server is listening on http://localhost:' + port);
    }
});
*/

// app.listen(3333, function () {
//     console.log('Web server is listening.');
// });
app.listen(process.env.PORT || 3333, function () {
    console.log('Web server is listening.');
});

