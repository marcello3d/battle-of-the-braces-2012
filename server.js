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
    'Artsy Fartsy': new Room(),
    'One ring to bind them': new Room(),
    'Pen is Mightier': new Room(),
};

socket.on('connection', function(connection) {
    function send(type, command) {
        command = command || {};
        command.type = type;
        connection.write(JSON.stringify(command));
        console.log('sending %j', command)
    }
    function sendError(message) {
        send('error', { message:message});
    }

    var user;

    Object.keys(rooms).forEach(function(room_name) {
        var room = rooms[room_name];
        room.on('join', function(user) {
            sendRooms();
        });

        room.on('leave', function(user) {
            sendRooms();
        });
    });

    function sendRooms() {
        send('rooms', {
            rooms: Object.keys(rooms).map(function(room_name) {
                var room = rooms[room_name];
                // Only send relevant data to the client
                return {
                    name: room_name,
                    users: room.users.map(function(roomUser) {
                        return {
                            name: roomUser.name
                        }
                    })
                };
            }),
            maxUsers: config.maxUsers
        });
    }

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
                sendRooms();
                // TODO: lobby user list?
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
                var maxUsers = config.maxUsers;

                if (Object.keys(room.users).length >= maxUsers) {
                    return sendError("Not enough room!");
                }

                room.join(user);
                user.room = room;

                // TODO: send updated room info to non-roomed users


                function getUsers() {
                    var roomUsers = {};
                    Object.keys(room.users).forEach(function(userId) {
                        roomUsers[userId] = {
                            name: room.users[userId].name
                        }
                    });
                    return roomUsers;
                }

                var roomUsers = getUsers();

                var waitingUsers = maxUsers - Object.keys(roomUsers).length;

                room.on('started', function() {
                    // user has items now
                    // send the user their items
                    send('game-start', {
                        user: {
                            id: user.id,
                            items: user.items.map(function(item) {
                                return {
                                    id:item.id,
                                    img:item.img,
                                    title:item.title,
                                    price:item.price
                                }
                            })
                        },
                        users: getUsers()
                    });
                });

                room.on('turn', function(round, user_id) {
                    send('turn', {
                        round: round,
                        user: user_id
                    });
                });

                room.on('leave', function() {
                    send('game-cancelled');
                    delete user.room;
                    room.reset();
                    room.removeAllListeners();
                });

                room.on('offer', function(user_id, item) {

                    // when a non active player selects a card
                    // all we know is that that user selected a card
                    if (room.active_player.id !== user_id) {
                        return send('card-offered', {
                            user: user_id
                        })
                    }

                    // when the active player selects a card
                    send('card-proposed', {
                        user: user_id,
                        card: {
                            id: item.id,
                            img: item.img,
                            title: item.title
                        }
                    });
                });

                room.on('offers', function(offers) {
                    var cleanedOffers = {};
                    Object.keys(offers).forEach(function (key) {
                        var listing = offers[key];
                        cleanedOffers[key] = {
                            id:listing.id,
                            img:listing.img,
                            title:listing.title
                        };
                    });

                    send('reveal-offerings', {
                        cards:cleanedOffers
                    });
                });

                room.on('picked', function(item_id) {
                    send('card-chosen', {
                        card: item_id
                    });
                });

                room.on('game-over', function() {

                    var winner;
                    room.users.forEach(function(user) {
                        var total = 0;
                        user.items.forEach(function(item) {
                            total += item.price;
                        });

                        user.score = total;

                        if (!winner || total > winner.score) {
                            winner = {
                                id: user.id,
                                score: total
                            };
                        }
                    });

                    send('game-complete', {
                        winner: winner,
                        users: room.users.map(function(usr) {
                            return {
                                id: usr.id,
                                score: usr.score,
                                items: usr.items.map(function(item) {
                                    return {
                                        price: item.price,
                                        title: item.title,
                                        img: item.img,
                                        url: item.url
                                    }
                                })
                            }
                        })
                    });
                });

                room.users.forEach(function(user) {
                    user.send('pre-game', {
                        status:
                            waitingUsers == 0 ?
                            'Setting up game...' :
                            'Waiting on '+(waitingUsers)+' more '+(waitingUsers==1 ? 'user' : 'users')+'...',
                        users: getUsers()
                    })
                });

                if (Object.keys(roomUsers).length === maxUsers) {
                    room.start();
                }
            },

            'propose-card':function(command) {
                user.room.offer(command.card);
            },

            'offer-trade':function(command) {
                user.room.offer(command.card);
            },

            'accept-offer':function(command) {
                user.room.pick(command.card);
            }
        };

        var type = commands[json.type];
        if (!type) {
            return sendError('command not recognized:', json.type);
        }

        type(json);
    });
    connection.on('close', function() {
        if (user && user.room) {
            user.room.leave(user);
            // TODO: send updated room info to non-roomed users
        }
        // TODO: lobby user list?
    });
});


// Start server
var server = app.listen(3333);
socket.installHandlers(server, {
    prefix:'/battle'
});
