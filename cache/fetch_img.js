// cache the images for the current listings

var listings = require('../cache/listings');
(function next(err) {
    var listing = listings.shift();
    if (!listing) {
        return;
    }

    var listing_id = listing.id;
    image_url(listing_id, function(err, res) {
        if (err) {
            return;
        }

        setTimeout(next, 250);
    });
})();
