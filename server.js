var express = require('express');
var stylus = require('stylus');
var sockjs = require('sockjs');

// local
var Room = require('./models/room.js');
var config = require('./config.js');

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

var rooms = {
    'catfuck': new Room()
};

socket.on('connection', function(connection) {
    function send(type, command) {
        command = command || {};
        command.type = type;
        connection.write(JSON.stringify(command));
        console.log('sending %j', command)
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
                    return sendError("already logged in");
                }
                user = {
                    name:command.username,
                    send: send
                };

                console.log("user logged in: ", user);
                send('login-ok');
                send('rooms', {
                    rooms: Object.keys(rooms).map(function(room_name) {
                        var room = rooms[room_name];
                        // Only send relevant data to the client
                        return {
                            name: room_name,
                            users: room.users.map(function(user) {
                                return {
                                    name: user.name,
                                    self: user.name === command.username
                                }
                            })
                        };
                    })
                });
            },

            'error': function(command) {
                console.error('client error', command.message);
            },

            'join':function(command) {
                if (user.room) {
                    return sendError("You're already in a room");
                }
                var room = rooms[command.name];
                if (!room) {
                    return sendError('No room!!');
                }

                room.join(user);
                user.room = room;

                var maxUsers = config.maxUsers;
                var roomUsers = room.users.map(function(usr) {
                    return {
                        name: usr.name,
                        self: usr.name === user.name
                    }
                });

                var waitingUsers = maxUsers - roomUsers.length;

                room.on('started', function() {
                    // user has items now
                    // send the user their items
                    send('game-start', {
                        items: user.items
                    });
                });

                room.users.forEach(function(user) {
                    user.send('pre-game', {
                        status:
                            waitingUsers == 0 ?
                            'setting up game...' :
                            'waiting on '+(waitingUsers)+' more '+(waitingUsers==1 ? 'user' : 'users')+'...',
                        users: roomUsers // TODO
                    })
                });

                if (roomUsers.length === maxUsers) {
                    room.start();
                }
            },

            'propose-card':function(command) {

            },

            'offer-trade':function(command) {

            },

            'accept-offer':function(command) {

            }
        };
        if (commands[json.type]) {
            commands[json.type](json);
        } else {
            sendError('command not recognized: '+json.type);
        }
    });
    connection.on('close', function() {
        if (user && user.room) {
            user.room.leave(user);
            room.leave(user);
        }
    });
});


// Start server
var server = app.listen(3333);
socket.installHandlers(server, {
    prefix:'/battle'
});
