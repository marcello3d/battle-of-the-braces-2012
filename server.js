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

var rooms = [
    {
        name:'test room',
        users:[]
    }
];

socket.on('connection', function(connection) {
    function send(type, command) {
        command = command || {};
        command.type = type;
        connection.write(JSON.stringify(command));
        console.log("sending")
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
                    sendError("already logged in");
                } else {
                    user = {
                        username:command.username
                    };
                    users.push(user);
                    console.log("user logged in: ", user);
                    send('login-ok');
                    send('rooms', {
                        rooms: rooms.map(function(room) {
                            // Only send relevant data to the client
                            return {
                                name:room.name,
                                users:[] // TODO
                            };
                        })
                    });
                }
            },

            'join':function(command) {
                if (user.room) {
                    sendError("You're already in a room");
                } else {
                    user.room = command.id;
                    var maxUsers = 4;
                    var roomUsers = [
                        {
                            name: "some user"
                        },
                        {
                            name: "some user"
                        },
                        {
                            name: "some user"
                        },
                        {
                            name: "some user"
                        }
                    ];
                    var waitingUsers = maxUsers - roomUsers.length;
                    send('game-state', {
                        state: 'waiting',
                        status:
                            waitingUsers == 0 ?
                                'setting up game...' :
                                'waiting on '+(waitingUsers)+' more '+(waitingUsers==1 ? 'user' : 'users')+'...',
                        users: roomUsers // TODO
                    })
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
        if (user) {
            var index = users.indexOf(user);
            if (index >= 0) {
                console.log("removing user: ", user);
                users[index] = users[users.length];
                users.length--;
            }
        }
    });
});


// Start server
var server = app.listen(3333);
socket.installHandlers(server, {
    prefix:'/battle'
});