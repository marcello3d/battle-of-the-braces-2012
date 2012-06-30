/// room contains information for a single game and the state

// builtin
var EventEmitter = require('events').EventEmitter;
var util = reqire('util');

// local
var etsy = require('../lib/etsy');

var RoomUser = function(user) {
    var self = this;
    self.user = user;

    // user starts with no items
    self.items = [];
};

RoomUser.add_item = function(item) {
    var self = this;
    self.items.push[item];
};

RoomUser.get_items = function() {
    return this.items;
};

var Room = function() {
    var self = this;
    self.users = [];

    // first user to join is the first to play
    self.turn = 0;
}
util.inheritis(Room, EventEmitter);

/// initialize a game room
Room.prototype.start = function() {

    var self = this;

    // why are there not 4 users??
    if (self.users.length !== 4) {
        return;
    }

    // load possible items
    etsy.active_listings(function(err, listings) {
        if (err) {
            // ??
            return console.error(err);
        }

        if (listings.length < 4 * 5) {
            return console.error(new Error('not enough listings'));
        }

        var listings = listings.slice(0, 20);
        var count = 0;
        var uid = 0;
        var user = users[uid];

        (function next(err) {
            if (err) {
                console.error(err);
            }

            // after this user has been assigned 5 items
            if (count++ > 5) {
                user = users[++uid];
                count = 0;
            }

            // assign items to the users
            var listing = listings.shift();

            // done loading
            if (!listing) {
                return self.emit('started');
            }

            // load the images for the listing
            etsy.image_url(listing.id, function(err, details) {
                if (err) {
                    return next(err);
                }

                listing.img = details;
                user.add_item(listing);
                next(err);
            });
        });
    });
}

/// add a user to the room
Room.prototype.join = function(user) {
    var self = this;
    users.push(new RoomUser(user));
};

Room.prototype.users = function() {
    return this.users;
};

