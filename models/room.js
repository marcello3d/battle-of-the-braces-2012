/// room contains information for a single game and the state

// builtin
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// local
var etsy = require('../lib/etsy');
var config = require('../config.js');

var Room = function(name) {
    var self = this;
    self.users = [];
    self.name = name;

    // first user to join is the first to play
    self.turn = 0;
};
util.inherits(Room, EventEmitter);

/// initialize a game room
Room.prototype.start = function() {

    var self = this;

    // why are there not 4 users??
    if (self.users.length !== config.maxUsers) {
        return;
    }

    // load possible items
    etsy.active_listings(function(err, listings) {
        if (err) {
            // ??
            return console.error(err);
        }

        var listingCount = config.maxUsers * config.startCardCount;
        if (listings.length < listingCount) {
            return console.error(new Error('not enough listings'));
        }

        listings = listings.slice(0, listingCount);
        var count = 0;
        var uid = 0;
        var user = self.users[uid];

        (function next(err) {
            if (err) {
                console.error(err);
            }

            // after this user has been assigned 5 items
            if (count++ >= config.startCardCount) {
                user = self.users[++uid];
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
                user.items.push(listing);
                next(err);
            });
        })();
    });
}

/// add a user to the room
Room.prototype.join = function(user) {
    var self = this;
    user.items = [];
    self.users.push(user);
};

Room.prototype.leave = function(user) {
    var self = this;

    var index = self.users.indexOf(user);
    if (index < 0) {
        return;
    }

    self.users.splice(index, 1);
};

module.exports = Room;
