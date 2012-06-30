var express = require('express');
var sockjs = require('sockjs');


// Setup express routes
var app = express();
app.set('view engine', 'hbs');

app.get('/', function(req, res){
    res.send('Hello There');
});



// Setup sockjs server
var echo = sockjs.createServer();

echo.on('connection', function(conn) {
    conn.on('data', function(message) {
        conn.write(message);
    });
    conn.on('close', function() {});
});


// Start server
var server = app.listen(3333);
echo.installHandlers(server, {prefix:'/echo'});