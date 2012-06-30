
// builtin
var fs = require('fs');

// local
var etsy = require('../lib/etsy');

var cache_file = __dirname + '/../cache/listings.json';

// array of listings
var listings = JSON.parse(fs.readFileSync(cache_file, 'utf8'));

/// get number of random listings from the etsy db
function random(count, cb) {

    var seen = [];

    // load listings file
    var out = [];

    while(out.length < count) {
        var idx = Math.floor(Math.random() * listings.length);
        if (seen.indexOf(idx) >= 0) {
            continue;
        }

        seen.push(idx);
        out.push(listings[idx]);
    }

    cb(null, out);
}

module.exports.random = random;
module.exports.image_url = etsy.image_url;

