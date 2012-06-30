$(function() {
    var sock = null;
    function connect() {
        sock = new SockJS(location.toString()+"battle");
        $('#status').text("[connecting...]");

        $('#login').show();
        $('#rooms').hide();
        $('#game').hide();

        sock.onopen = function() {
            console.log('open');
            $('#status').text("[online]");
        };
        sock.onmessage = function(e) {
            console.log("got message", e.data);
            var json = JSON.parse(e.data);
            var commands = {
                'login-ok': function(command) {
                    $('#login').hide(500);
                    $('#rooms').show(500);
                },

                'rooms': function(command) {
                    var roomsList = $('#rooms ul');
                    roomsList.empty();
                    command.rooms.forEach(function(room) {
                        var li = $('<li><a href="#"></a></li>');
                        li.find('a').text(room.name).on('click', function() {
                            alert("join room : "+ room.name);
                            send('join', room);
                            return false;
                        });
                        roomsList.append(li)
                    });
                },

                'game-state': function(command) {

                },

                'card-proposed':function(command) {

                },

                'trade-offered':function(command) {

                },

                'trade-accepted':function(command) {

                }
            };
            if (commands[json.type]) {
                commands[json.type](json);
            } else {
                sendError('command not recognized: '+json.type);
            }
        };
        sock.onclose = function() {
            $('#status').text("[offline]");
            console.log('closed, reconnecting...');
            setTimeout(connect, 1500);
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

    if (window.localStorage) {
        $('#username').val(window.localStorage['username']);
    }

    $('#login').on('submit', function(event) {
        var username = $('#username').val();
        console.log("login:"+username);

        if (window.localStorage) {
            window.localStorage['username'] = username;
        }
        send('login', { username: username });
        return false;
    });
});