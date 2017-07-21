'use strict';

var bcrypt = require('bcrypt-as-promised');
var HASH_ROUNDS = 10;

class RedditAPI {
    constructor(conn) {
        this.conn = conn;
    }

    createUser(user) {
            /*
            First we have to hash the password. we will learn about hashing next week.
            the goal of hashing is to store a digested version of the password from which
            it is infeasible to recover the original password, but which can still be used
            to assess with great confidence whether a provided password is the correct one or not
             */
            return bcrypt.hash(user.password, HASH_ROUNDS)
                .then(hashedPassword => {
                    return this.conn.query('INSERT INTO users (username, password) VALUES (?, ?)', [user.username, hashedPassword]);
                })
                .then(result => {
                    return result.insertId;
                })
                .catch(error => {
                    // Special error handling for duplicate entry
                    if (error.code === 'ER_DUP_ENTRY') {
                        throw new Error('A user with this username already exists');
                    } else {
                        throw error;
                    }
                });

        } // createUser ends

    createPost(post) {

            if (post.subredditId === undefined) {
                console.log('here');
                throw new Error('subredditIs is not provided');

            }

            return this.conn.query(
                    `
            INSERT INTO posts (userId, title, url, subredditId)
            VALUES (?, ?, ?, ?)
            `, [post.userId, post.title, post.url, post.subredditId]
                )
                .then(result => {
                    return result.insertId;
                });

        } // createPost ends

    getAllPosts() {
            /*
            Strings delimited with ` are an ES2015 feature called "template strings".
            they are more powerful than what we are using them for here. one feature of
            template strings is that you can write them on multiple lines. if you try to
            skip a line in a single- or double-quoted string, you would get a syntax error.

            therefore template strings make it very easy to write SQL queries that span multiple
            lines without having to manually split the string line by line.

             SELECT posts.id AS postId, title, url, SUM(voteDirection) AS totalVotes
             FROM posts JOIN votes
             ON posts.id = votes.postId
             GROUP BY postId
             */
            return this.conn.query(
                `
            SELECT posts.id AS postId, title, url, users.id AS userId, username
            FROM posts JOIN users
            ON posts.id = users.id
            GROUP BY postId`
            );

    } // getAllPosts ends

    createSubreddit(subreddit) {
            /*
            Function takes a subreddit object that contains a 'name' and 'description',
            inserts the new subreddit and return the ID of the new subreddit.
             */
            return this.conn.query(
                    `
            INSERT INTO subreddits (name, description)
            VALUES (?, ?)`, [subreddit.name, subreddit.description]
                )
                .then(result => {
                    return result.insertId;
                })
                .catch(error => {
                    // Special error handling for duplicate entry
                    if (error.code === 'ER_DUP_ENTRY') {
                        throw new Error('A subreddit with this name already exists');
                    } else {
                        throw error;
                    }
                });

        } // createSubreddit ends

    getAllSubreddis() {
            /*
             Function returns the list of all subreddits, ordered by the
             the newly created ones first.
             */
            return this.conn.query(
                `
            SELECT id, name, description, createdAt, updatedAt
            FROM subreddits
            ORDER BY createdAt DESC
            `
            );

        } // getAllSubreddis ends

    luke(){
        return Promise.resolve(5);
    }

    createdComment(comment) {
            /*
            Function takes an object which contains a text, userId, postId and option
            partentId, inserts the the new comment, and either return an error or the
            of the new comment.
            */

            //If parentId is not defined should be set to NULL
            var parentId;

            if (comment.parentId === undefined) {
                parentId = null;
            }

            return this.conn.query(
                    `
            INSERT INTO comments (userId, postId, parentId, text)
            VALUES (?, ?, ?, ?)
            `, [comment.userId, comment.postId, parentId, comment.text]
                )
                .then(result => {
                    return result.insertId;
                });

    } // createdComment ends


    getCommentsForPost(postId) {


            return this.conn.query(
                `
            SELECT id, parentId, text, createdAt, updatedAt
            FROM comments
            WHERE postId = ?
            `, [postId]
            );

        } // getCommentsForPost ends


} // class RedditAPI ends

module.exports = RedditAPI;