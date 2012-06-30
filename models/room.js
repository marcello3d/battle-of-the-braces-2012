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

    // item id -> item
    self.items = {};

    // first user is first to play
    self.round = 0;

    // offer of the turn user
    self.user_offer = undefined;

    // items the other users have offered
    // user_id -> item
    self.offers = {};
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
                self.emit('started');
                self.next_turn();
                return;
            }

            // load the images for the listing
            etsy.image_url(listing.id, function(err, details) {
                if (err) {
                    return next(err);
                }

                listing.img = details;
                user.items.push(listing);

                listing.user = user;
                self.items[listing.id] = listing;

                next(err);
            });
        })();
    });
};

Room.prototype.next_turn = function() {
    var self = this;

    var idx = self.round % config.maxUsers;

    // game over?
    if (++self.round >= config.maxRounds) {
        return self.emit('game-over');
    }

    self.active_player = self.users[idx];
    self.user_offer = undefined;

    // next user's term
    self.emit('turn', self.round, idx);
};

/// add a user to the room
Room.prototype.join = function(user) {
    var self = this;
    user.items = [];
    user.id = self.users.length;
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

    var listing = self.items[item_id];

    // the item may belong to the turn's user
    // TODO check that the user owns this item
    if (!self.user_offer) {
        self.user_offer = listing;
    }

    // user has offered the item
    // other users now need to submit their offerings
    self.emit('offer', user_id, item_id);

    // offers is user_id -> item
    offers[listing.user.id] = listing;

    if (offers.length >= config.maxUsers - 1) {
        // send the offers so that they will be visible for selection
        self.emit('offers', offers);
    }
};

// the user has selected an offering
Room.prototype.pick = function(item_id) {
    var self = this;

    var listing = self.items[item_id];
    var counter_party = listing.user;

    var player = self.active_player;

    // switch owning user for the items
    self.user_offer.user = counter_party;
    listings.user = player;

    // TODO splice out the item from the user
    player.items;
    counter_party.items;

    // user has picked an offered item
    self.emit('picked', item_id);

    self.next_turn();
};

module.exports = Room;
