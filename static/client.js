$(function() {
    var sock = null;
    function connect() {
        sock = new SockJS(location.protocol+"//"+location.host+"/battle");
        $('#status').text("[connecting...]");

        $('#login').show();
        $('#rooms').hide();
        $('#waiting').hide();
        $('#game').hide();

        sock.onopen = function() {
            console.log('open');
            $('#status').text("[online]");
            if ($('#username').val()) {
                login();
            }
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
                        function join() {
                            send('join', room);
                            location.hash = room.name;
                            return false;
                        }
                        var li = $('<li><a href="#"></a></li>');
                        li.find('a').text(room.name).on('click', join);
                        roomsList.append(li);
                        if (room.name == location.hash.slice(1)) {
                            join();
                        }
                    });
                },

                'game-state': function(command) {
                    switch (command.state) {
                        case 'waiting':
                            $('#rooms').hide(500);
                            $("#waiting .status").text(command.status);

                            var userList = $('#waiting ul');
                            userList.empty();
                            command.users.forEach(function(user) {
                                userList.append($('<li></li>').text(user.name))
                            });

                            $('#waiting').show(500);
                            break;
                        case 'started':
                            $('#rooms').hide(500);
                            $('#waiting').hide(500);
                            $('#game').show(500);
                            break;
                        case 'your-turn':
                            break;
                        case 'waiting-turn':
                            break;
                        case 'your-offer':
                            break;
                        case 'finished':
                            break;
                    }
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