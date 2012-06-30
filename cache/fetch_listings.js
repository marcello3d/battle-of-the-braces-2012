var fs = require('fs');

var etsy = require('../lib/etsy');

var cache_file = __dirname + '/../cache/listings.json';

var all_listings = [];

var ranges = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
//var ranges = [10, 20];

(function next() {
    var range = ranges.shift();
    if (!range) {
        console.log('number of listings:', all_listings.length);
        fs.writeFile(cache_file, JSON.stringify(all_listings), 'utf8');
        return;
    }

    var min = range;
    var max = range + 10;
    etsy.fetch_listings(min, max, function(err, listings) {
        all_listings.push.apply(all_listings, listings);
        next();
    });
})();

