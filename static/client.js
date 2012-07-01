$(function() {
    var sock = null;
    function connect() {
        sock = new SockJS(location.protocol+"//"+location.host+"/battle");
        $('#status').text("connecting...");

        $('#login').hide();
        $('#rooms').hide();
        $('#waiting').hide();
        $('#game').hide();
        $('#end').hide();

        sock.onopen = function() {
            console.log('open');
            $('#status').text("online");
            $('#login').show();
            $('#end').hide();
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
        var users;
        var myCards;
        var currentTurnUserId;
        var currentOfferCount;
        var revealedCards;
        var proposedCard;

        function instructions(title, message, waiting) {
            var instruction = $('#instruction');
            instruction.toggleClass("waiting", !!waiting);
            $('#instruction b').text(title||'');
            $('#instruction span').text(" "+(message||''));
        }

        function userName(id) {
            return "Player "+users[id].number+" ("+users[id].name+")";
        }

        function enableClicking(callback) {
            $('#game .your-cards').addClass('selectable');
            myCards.forEach(function(card) {
                card.div.on("click", function() {
                    callback(card);
                    $('#game .your-cards').removeClass('selectable');
                    myCards.forEach(function(card) {
                        card.div.off("click");
                    });
                });
            });
        }

        sock.onmessage = function(e) {
            var json = JSON.parse(e.data);
            console.log("got message: "+json.type, json);
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
                        li.append($('<span></span>').text(" — "+(
                            room.users.length ?
                                room.users.map(function(user) {
                                return user.name
                            }).join(", ") : "Empty")));
                        roomsList.append(li);
                        if (room.name == location.hash.slice(1)) {
                            join();
                        }
                    });
                    $('.card').remove();
                },

                'pre-game': function(command) {
                    state = WAITING;

                    $('#rooms').hide(500);
                    $("#waiting .status").text(command.status);

                    var userList = $('#waiting ul');
                    var username = $('#username').val();

                    userList.empty();
                    Object.keys(command.users).forEach(function(userId) {
                        var user = command.users[userId];
                        userList.append($('<li></li>').text(user.name).toggleClass('you',user.self));
                    });

                    $('.card').remove();

                    $('#waiting').show(500);
                },

                'game-start': function(command) {
                    state = WAITING;
                    myUserId = command.user.id;

                    $('#rooms').hide(500);
                    $('#waiting').hide(500);
                    $('#game').show(500);

                    var cards = $('#game .your-cards');
                    cards.find('div').remove();
                    myCards = command.user.items;
                    myCards.forEach(function(item) {
                        var div = $('<div class="card">' +
                            '<img>' +
                            '<div class="title">'+item.title+'</div>' +
                            '<div class="price"><span class="dollar">$</span>'+Math.ceil(item.price)+'</div>' +
                            '</div>');
                        div.find('img').attr('src', item.img.medium).attr('title', div.find(".title").text());
                        cards.append(div);
                        item.div = div;
                    });

                    users = command.users;

                    var playerNumber = 1;
                    Object.keys(users).forEach(function(userId) {
                        users[userId].number = playerNumber++;
                    });

                    var otherPlayers = $("#game .other-players");
                    otherPlayers.empty();
                    Object.keys(users).forEach(function(userId) {
                        if (userId != myUserId) {
                            var div = $('<div class="player"><span></span></div>');
                            div.find('span').text(userName(userId)+":");
                            users[userId].cards = [];
                            users.div = div;
                            for (var i=0; i<myCards.length; i++) {
                                var card = $('<div class="card other-card small-card">etsy*trade</div>');
                                div.append(card);
                                users[userId].cards.push(card);
                            }
                            otherPlayers.append(div);
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
                        instructions("Your turn, "+userName(myUserId), "You must choose a card to trade.");
                        enableClicking(function(card) {
                            instructions("Please wait...", "The other players are selecting cards to trade...", true);

                            send('propose-card', {
                                card: card.id
                            });
                            card.div.hide(500,function(){
                                card.div.remove();
                                $('#game .table-proposed').append(card.div.hide().show(500));
                            });
                        });
                    } else {
                        instructions("Please wait.", userName(currentTurnUserId)+" is selecting a card", true);
                    }
                    currentOfferCount = 0;
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
                    // Current player has made offer
                    // TODO: animate in the current player's card
                    if (currentTurnUserId != myUserId) {
                        state = OFFER_CARD;
                        instructions("Trade time!",
                            "You must offer a card to trade with " + userName(currentTurnUserId) + ".");

                        var item = command.card;

                        proposedCard = item;

                        var div = $('<div class="card proposed-card">' +
                            '<img>' +
                            '<div class="title">'+item.title+'</div>' +
                            '</div>');
                        div.find('img').attr('src', item.img.medium).attr('title', div.find(".title").text());
                        $('#game .table-proposed').append(div.hide().show(500));
                        item.div = div;

                        enableClicking(function(card) {
                            instructions("Please wait...", "Others to offer their cards", true);

                            send('offer-trade', {
                                card: card.id
                            });

                            card.div.hide(500,function() {
                                card.div.remove();
                            });
                            currentOfferCount++;
                        });
                    }
                },
                'card-offered' : function(command) {
//                    {
//                        user: <id>
//                    }

                    // A player has made an offer to the current player
                    // TODO animate in blank card for that player
                    $('#game .table-offered').append($('<div class="card other-card">' +
                            '<div>etsy*trade</div>'+
                            '</div>').hide().show(500));
                    if (users[command.user].cards) {
                        var card = users[command.user].cards.pop();
                        card.hide(500,function() {
                            card.remove();
                        });
                    }
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

                    // TODO animate all cards into stack
                    // TODO animate cards out
                    // TODO animate cards flip over

                    revealedCards = command.cards;


                    var tableCenter = $("#game .table-offered")
                    tableCenter.find('div').remove();
                    Object.keys(command.cards).forEach(function(key) {
                        var card = command.cards[key];
                        var div = $('<div class="card offered">' +
                            '<img>' +
                            '<div class="title">'+card.title+'</div>' +
                            '</div>');
                        div.find('img').attr('src', card.img.medium).attr('title', div.find(".title").text());
                        tableCenter.append(div);
                        if (currentTurnUserId == myUserId) {
                            div.on('click', function() {
                                send('accept-offer', { card: card.id });
                                tableCenter.removeClass('selectable');
                                div.off('click');
                                instructions("Please wait...",'',true);
                            });
                        }
                    });

                    if (currentTurnUserId == myUserId) {
                        state = CHOOSE_OFFER;
                        instructions("Select an offered card");
                        tableCenter.addClass('selectable');
                    } else {
                        instructions("Please wait...", userName(currentTurnUserId)+" is selecting a trade...",true);
                    }
                },
                'card-chosen' : function(command) {
//                    {
//                        card: (card id)
//                    }
                    // TODO animate selected card to current player
                    // TODO animate other cards to various players
                    instructions("Card selected!");
                    var chosenCardUserId;

                    Object.keys(revealedCards).forEach(function(userId) {
                        var card = revealedCards[userId];
                        if (card.id == command.card) {
                            chosenCardUserId = userId;
                        }
                    });

                    Object.keys(revealedCards).forEach(function(userId) {
                        var card = revealedCards[userId];

                        var div = $('<div class="card small-card">' +
                            '<img>' +
                            '<div class="title">' + card.title + '</div>' +
                            '</div>');
                        div.find('img').attr('src', card.img.medium).attr('title', div.find(".title").text());


                        if (currentTurnUserId == myUserId) {
                            if (card.id == command.card) {
                                $('#game .your-locked-cards').append(div);
                            }
                        } else {
//                            if (card.id == command.card) {
//                                users[currentTurnUserId].div.append(div);
//                            }
                        }
//                        if (userId == chosenCardUserId && card.id == proposedCard.id) {
//                            users[chosenCardUserId].div.append(div);
//                        }
                    });

                    if (chosenCardUserId == myUserId) {
                        var card = proposedCard
                        var div = $('<div class="card small-card">' +
                            '<img>' +
                            '<div class="title">' + card.title + '</div>' +
                            '</div>');
                        div.find('img').attr('src', card.img.medium).attr('title', div.find(".title").text());

                        $('#game .your-locked-cards').append(div);
                    }

                    $('.table-offered .card').hide(500);
                    $('.table-proposed .card').hide(500);
                    setTimeout(function() {
                        $('.table-offered .card').remove();
                        $('.table-proposed .card').remove();
                    }, 400);
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
                    // TODO show scores
                    // TODO Flip all cards
                    instructions("Game over!");
                    $('#game').hide(500);
                    var winnerId = command.winner.id;
                    $('#end .status').text(userName(winnerId)+" wins!");

                    $('#end .winner').empty();
                    $('#end .losers').empty();


                    var winner = command.users[winnerId];
                    populateUser($('#end .winner'), winnerId, winner);

                    Object.keys(command.users).forEach(function(userId) {
                        if (userId != command.winner.id) {
                            var div = $('<div class="profile loser"></div>');
                            $('#end .losers').append(div);
                            populateUser(div, userId, command.users[userId]);
                        }
                    });
                    function populateUser(userDiv, userId, user) {
                        userDiv.append($('<h2></h2>').text(userName(userId)+" — Final score: $"+Math.ceil(user.score)));
                        user.items.forEach(function(item) {

                            var div = $('<div class="card">' +
                                '<img>' +
                                '<div class="title">'+item.title+'</div>' +
                                '<div class="price"><span class="dollar">$</span>'+Math.ceil(item.price)+'</div>' +
                                '</div>');
                            div.find('img').attr('src', item.img.medium).attr('title', div.find(".title").text());
                            div.on('click',function() {
                                window.open(item.url, "_blank");
                            });
                            userDiv.append(div);
                        })
                    }

                    $('#end').show(500);
                },
                'game-cancelled': function(command) {
                    $('#rooms').show(500);
                    $('#waiting').hide(500);
                    $('#game').hide(500);
                    $('#end').hide(500);
                    window.location = location.toString();
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
        send('error', { message:message});
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
