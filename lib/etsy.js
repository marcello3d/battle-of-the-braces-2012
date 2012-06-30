
var fs = require('fs');
var querystring = require('querystring');

var request = require('request');

var cache_dir = __dirname + '/../cache';

// make sure the image cache dir is available
if (!fs.existsSync(cache_dir + '/img/')) {
    fs.mkdirSync(cache_dir + '/img/');
}

//var host = 'http://sandbox.openapi.etsy.com/v2'
var host = 'http://openapi.etsy.com/v2';
var api_key = 'hzbfhr3dcomp22uoi0gz9ewm';

function api_request(url, cb) {
    var api_sep = (url.indexOf('?') > 0) ? '&' : '?';
    var uri = host + url + api_sep + 'api_key=' + api_key;
    request(uri, function(err, res, body) {
        if (err) {
            return cb(err);
        }

        return cb(null, JSON.parse(body));
    });
}

function fetch_listings(min_price, max_price, cb) {
    var params = querystring.stringify({
        limit: 50,
        min_price: min_price,
        max_price: max_price,
    });

    api_request('/listings/active?' + params, function(err, res) {
        if (err) {
            return cb(err);
        }

        var items = res.results;

        var out = [];
        for (var i=items.length - 1 ; i >= 0 ; --i) {
            var item = items[i];
            out.push({
                url: item.url,
                price: item.price - 0,
                title: item.title,
                id: item.listing_id
            });
        }

        return cb(null, out);
    });
}

/// get image urls
/// callback(err, { small, medium, large }
/// small is 75x75, medium is 170x135, large is 570xN
function image_url(listing_id, cb) {
    var filename = cache_dir + '/img/' + listing_id;
    fs.exists(filename, function(exists) {
        if (exists) {
            return fs.readFile(filename, 'utf8', function(err, data) {
                if (err) {
                    return cb(err);
                }
                return cb(null, JSON.parse(data));
            });
        }

        api_request('/listings/' + listing_id + '/images', function(err, res) {
            if (err) {
                return cb(err);
            }

            var img = res.results.shift();
            if (!img) {
                return cb(new Error('no images for listing: ' + listing_id));
            }

            var out = {
                small: img['url_75x75'],
                medium: img['url_170x135'],
                large: img['url_570xN']
            };

            fs.writeFile(filename, JSON.stringify(out));
            return cb(null, out);
        });
    });
}

module.exports.fetch_listings = fetch_listings;
module.exports.image_url = image_url;

