$(function() {
    var sock = null;
    function connect() {
        sock = new SockJS(location.protocol+"//"+location.host+"/battle");
        $('#status').text("connecting...");

        $('#login').hide();
        $('#rooms').hide();
        $('#waiting').hide();
        $('#game').hide();

        sock.onopen = function() {
            console.log('open');
            $('#status').text("online");
            $('#login').show();
            if ($('#username').val()) {
                login();
            }
        };

        // user interaction state
        var WAITING = 'waiting';
        var PROPOSE_CARD = 'propose-card';
        var OFFER_CARD = 'offer-card';
        var CHOOSE_OFFER = 'choose-offer';

        var state = WAITING;
        var myUserId;
        var currentTurnUserId;

        sock.onmessage = function(e) {
            var json = JSON.parse(e.data);
            console.log("got message", json);
            var commands = {
                'login-ok': function(command) {
                    $('#login').hide(500);
                    $('#rooms').show(500);
                },

                'error': function(command) {
                    console.error('server error', command.message);
                },

                'rooms': function(command) {
                    var roomsList = $('#rooms ul');
                    roomsList.empty();
                    command.rooms.forEach(function(room) {
                        function join() {
                            send('join', room);
                            location.hash = room.name;
                            return false;
                        }
                        var li = $('<li><a href="#"></a></li>');
                        li.find('a').text(room.name).on('click', join);
                        li.append($('<span></span>').text(" — "+room.users.map(function(user) {
                            return user.name
                        }).join(", ")));
                        roomsList.append(li);
                        if (room.name == location.hash.slice(1)) {
                            join();
                        }
                    });
                },

                'pre-game': function(command) {
                    state = WAITING;

                    $('#rooms').hide(500);
                    $("#waiting .status").text(command.status);

                    var userList = $('#waiting ul');
                    userList.empty();
                    var username = $('#username').val();
                    command.users.forEach(function(user) {
                        userList.append($('<li></li>').text(user.name).toggleClass('you',user.self));
                    });

                    $('#waiting').show(500);

                },

                'game-start': function(command) {
                    state = WAITING;
                    myUserId = command.user.id;

                    $('#rooms').hide(500);
                    $('#waiting').hide(500);
                    $('#game').show(500);

                    var cards = $('#game ul.your-cards');
                    command.items.forEach(function(item) {
                        var image = $('<div class="card">' +
                            '<img>' +
                            '<div class="title">'+item.title+'</div>' +
                            '<div class="price"><span class="dollar">$</span>'+Math.ceil(item.price)+'</div>' +
                            '</div>');
                        image.find('img').attr('src', item.img.medium).attr('title', image.find(".title").text());
                        cards.append($('<li></li>').append(image));
                        console.dir(item)
                    });

                    var gameUserList = $('#game ul.users');
                    gameUserList.empty();
                    command.users.forEach(function(user) {
                        if (!user.self) {
                            gameUserList.append($('<li></li>').text(user.name));
                        }
                    });

                },
                'turn' : function(command) {
//                    {
//                        round: 1
//                        user: <id>
//                    }
                    currentTurnUserId = command.user;
                    if (currentTurnUserId == myUserId) {
                        state = PROPOSE_CARD;
                    }
                },
                'card-proposed' : function(command) {
//                    {
//                        user: <id>,
//                        card: { // PROPOSED CARD
//                            img: {
//                                ...
//                            },
//                            title: ...
//                        }
//                    }
                    state = OFFER_CARD;
                },
                'card-offered' : function(command) {
//                    {
//                        user: <id>
//                        card: { // ONLY IF YOUR TURN
//                            id: ...
//                            img: {
//                                ...
//                            },
//                            title: ...
//                        }
//                    }
                    state = WAITING;
                },
                'reveal-offerings' : function(command) {
//                    {
//                        cards: { // MAP USER ID -> OFFERED CARDS
//                          0: {
//                              id: ...
//                              img: {
//                                    ...
//                              },
//                              title: ...
//                          }
//                          2: {
//                              id: ...
//                              img: {
//                                    ...
//                              },
//                              title: ...
//                          }
//                          3: {
//                              id: ...
//                              img: {
//                                    ...
//                              },
//                              title: ...
//                         }
//                    }
                    if (myTurn) {
                        state = CHOOSE_OFFER;
                    }
                },
                'card-chosen' : function(command) {
//                    {
//                        card: (user id)
//                    }
                },
                'game-complete': function(command) {
//                    {
//                        users: [
//                            {
//                                score: 250,
//                                cards: [ full card objects ]
//                            },
//                            ...
//                        ]
//                    }
                }
            };
            if (commands[json.type]) {
                commands[json.type](json);
            } else {
                sendError('command not recognized: '+json.type);
            }
        };
        sock.onclose = function() {
            $('#status').text("offline");
            console.log('closed, reconnecting...');
            setTimeout(function() {
                $('#status').text("reconnecting...");
                connect();
            }, 1500);
        };
    }
    connect();

    function send(type, command) {
        command = command || {};
        command.type = type;
        sock.send(JSON.stringify(command));
    }
    function sendError(message) {
        send('error', { message:'message'});
    }

    function login() {
        var username = $('#username').val();
        console.log("login:"+username);

        if (window.localStorage) {
            window.localStorage['username'] = username;
        }
        send('login', { username: username });
        return false;
    }
    $('#login').on('submit', login);

    if (window.localStorage) {
        $('#username').val(window.localStorage['username']);
    }
});
