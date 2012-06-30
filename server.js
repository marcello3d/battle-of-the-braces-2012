var express = require('express');
var stylus = require('stylus');
var sockjs = require('sockjs');


// Setup express routes
var app = express();
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

app.use(stylus.middleware({
    src: __dirname + '/styles',
    dest: __dirname + '/static'
}));

app.get('/', function(req, res){
    res.render('index', {
        title: "etsy*trade"
    });
});

//app.use(express.favicon(__dirname + '/static/favicon.ico'));
app.use(express.static(__dirname + '/static'));

// Setup sockjs server
var socket = sockjs.createServer();

var users = [];

socket.on('connection', function(connection) {
    function send(type, command) {
        command |= {};
        command.type = type;
        connection.write(JSON.stringify(command));
    }
    function sendError(message) {
        send('error', { message:'message'});
    }

    var user;

    connection.on('data', function(message) {
        var json = JSON.parse(message);
        console.log("got message", message);
        var commands = {
           'login': function(command) {
                if (user) {
                    sendError("already logged in")
                } else {
                    user.username = command.username;
                    users.push(user);
                    send('login-ok');
                    send('game-state', {
                        state: 'lobby',
                        rooms: [] // TODO
                    })
                }
            },

            'roomlist': function(command) {

            },

            'join':function(command) {
                send('game-state', {
                    state: 'waiting',
                    currentUsers: [] // TODO
                })
            },

            'propose-card':function(command) {

            },

            'offer-trade':function(command) {

            },

            'accept-offer':function(command) {

            }
        };
        if (commands[message.type]) {
            commands[message.type](message);
        } else {
            sendError('command not recognized: '+message.type);
        }
    });
    connection.on('close', function() {
        if (user) {
            var index = users.indexOf(user);
            users[index] = users[users.length]
        }
    });
});


// Start server
var server = app.listen(3333);
socket.installHandlers(server, {
    prefix:'/battle'
});