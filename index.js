var request = require('request');
var cheerio = require('cheerio');
var pushbullet = require('pushbullet');
var fs = require('fs');

// load the required config.json file from the root of the project
var config = JSON.parse(fs.readFileSync('config.json'));

// intialize the pushbullet api using your token
var pusher = new pushbullet(config.pushbullet_token);

// cache and init
var products = config.products;
var interval = config.default_interval;

// check each product to see if its in stock
function checkAllProducts() {

  if(products.length > 0) {
    for(var i = 0; i < products.length; i++) {
      var product = products[i];
      if(typeof product.found === 'undefined' || !product.found) {
        checkStock(product, i);
      } else {
        console.log('Skipping ' + product.name);
      }
    }
  }

}

// check an individual product and if found, notify you via push bullet and update the products array to stop looking for it.
function checkStock(product, product_index) {

  var options = {
    url: product.url,
    headers: {
      'User-Agent' : 'request'
    }
  };

  request.get(options, function(error, response, body) {
    if (!error) {
      console.log('Searching for: ' + product.name);
      
      $ = cheerio.load(body);
      var cheerio_selector_length = eval(product.cheerio_selector);
      
      // check if there is an add to cart button on the page
      if (typeof cheerio_selector_length !== 'undefined' && cheerio_selector_length > 0) {
        
        // lets skip this sucker for the rest of the time since we've found it
        products[product_index].found = true;

        var title = 'In-Stock Alert: ' + product.name;
        
        console.log('-- In stock');
        // lets push to pusher
        pusher.link({}, title, product.url, function(error, response) {
          if(error) {
            console.log(error);
          }
        });

      } else {
        console.log('-- Not in stock');
      }
    } else {
      console.log(error);
    }
  });

}

// start running the scrape
checkAllProducts();

// continue checking for products at the configuration intervarl
setInterval(function (){
  checkAllProducts();
}, interval);