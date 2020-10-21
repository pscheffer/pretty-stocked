const cheerio = require('cheerio')
const pushbullet = require('pushbullet')
const fs = require('fs')
const sa = require('superagent')

// load the required config.json file from the root of the project
const config = JSON.parse(fs.readFileSync('config.json'))

// intialize the pushbullet api using your token
const pusher = new pushbullet(config.pushbullet_token)

// cache and init
const products = config.products;
const interval = config.default_interval;

// check each product to see if its in stock
const checkAllProducts = () => {

  if(products.length > 0) {
    for(var i = 0; i < products.length; i++) {
      var product = products[i];
      if(typeof product.found === 'undefined' || !product.found) {
        checkStock(product, i)
      } else {
        console.log('Skipping ' + product.name)
      }
    }
  }

}

// check an individual product and if found, notify you via push bullet and update the products array to stop looking for it.
const checkStock = async (product, product_index) => {

  try {
    console.log(`Searching inventory for: ${product.name}`)
    const res = await sa.get(product.url).set(product.request_headers || {})
    $ = cheerio.load(res.text)
    var cheerio_selector_length = eval(product.cheerio_selector_length)
    // check if there is an add to cart button on the page
    if (typeof cheerio_selector_length !== 'undefined' && cheerio_selector_length > 0) {
            
      // lets skip this sucker for the rest of the time since we've found it
      products[product_index].found = true

      var title = `In Stock Alert: ${product.name}`
      
      console.log(`${product.name} -- In stock`)
      // lets push to pusher
      pusher.link({}, title, product.url, function(error, response) {
        if(error) {
          console.log(error)
        }
      });
    } else {
      console.log(`${product.name} -- Not in stock`)
    }
  } catch (error) {
    console.error(error)
  }

}

// start running the scrape
checkAllProducts()

// continue checking for products at the configuration intervarl
setInterval(function (){
  checkAllProducts()
}, interval)