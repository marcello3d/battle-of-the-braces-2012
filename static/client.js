$(function() {
    var sock = null;
    function connect() {
        sock = new SockJS(location.toString()+"battle");
        $('#status').text("[connecting...]");
        sock.onopen = function() {
            console.log('open');
            $('#status').text("[online]");
        };
        sock.onmessage = function(e) {
            console.log('message', e.data);
        };
        sock.onclose = function() {
            $('#status').text("[offline]");
            console.log('close, reconnecting...');
            setTimeout(connect, 1500);
        };
    }
    connect();

    function send(type, command) {
        command |= {};
        command.type = type;
        sock.send(JSON.stringify(command));
    }
    function sendError(message) {
        send('error', { message:'message'});
    }

    if (window.localStorage) {
        $('#username').val(window.localStorage['username']);
    }

    $('#login').submit(function(event) {
        var username = $('#username').val();
        console.log("login:"+username);

        if (window.localStorage) {
            window.localStorage['username'] = username;
        }
        send('login', { username: username });
        return false;
    });
});