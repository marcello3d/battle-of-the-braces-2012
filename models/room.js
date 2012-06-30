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

    // first user is first to play
    self.round = 0;

    // offer of the turn user
    self.user_offer;

    // items the other users have offered
    self.offers = [];

    // first time game is started
    self.once('started', function() {
        // tell the first user it is their turn
        self.emit('turn', self.round);
    });
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

// the user is offering up an item for trade
Room.prototype.offer = function(item_id) {
    var self = this;

    // the item may belong to the turn's user
    // TODO check that the user owns this item
    if (!self.user_offer) {
        self.user_offer = item_id;
    }

    // user has offered the item
    // other users now need to submit their offerings
    self.emit('offer', item_id);

    offers.push(item_id);

    if (offers.length >= config.maxUsers - 1) {
        // send the offers so that they will be visible for selection
        self.emit('offers', offers);
    }
};

// the user has selected an offering
Room.prototype.pick = function(item_id) {
    var self = this;

    // switch the user's proposed item with the selected item
    // self.user_offer

    // user has picked an offered item
    self.emit('pick', item_id);

    // game over?
    if (++self.round >= config.maxRounds) {
        return self.emit('game-over');
    }

    // next user's term
    self.emit('turn', self.round % config.maxUsers);
};

module.exports = Room;
