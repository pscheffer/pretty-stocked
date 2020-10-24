const cheerio = require('cheerio')
const pushbullet = require('pushbullet')
const fs = require('fs')
const sa = require('superagent')
const notifier = require('node-notifier') 

// load the required config.json file from the root of the project
const config = JSON.parse(fs.readFileSync('config.json'))

// intialize the pushbullet api using your token
const pusher = new pushbullet(config.pushbullet_token)

// cache and init
const products = config.products
var default_interval = config.default_interval || 5000
var interval = default_interval
var error_count = 0

const notifyPushbullet = async (product, title) => {
  // lets push to pusher
  pusher.link({}, title, product.url, function(error, response) {
    if(error) {
      console.log(error)
    }
  });
}

const notifyDiscord = async (product, title) => {
  try {
    var webhook_response = await sa.post(config.discord_webhook_url)
      .set('Content-Type', 'application/json')
      .send({
        content: `${title} @everyone`,
        embeds: [
          {
            title: product.url,
            url: product.url
          }
        ]
      })
  } 
  catch (error) {
    console.log(error)
  }
}

const sendNotifications = async(product) => {
  var title = `In Stock Alert: ${product.name}`
  console.log(title)
  notifier.notify({
    title: title,
    message: product.url
  });
  if(config.discord_webhook_url) {
    notifyDiscord(product, title)
  }
  if(config.pushbullet_token) {
    notifyPushbullet(product, title)
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
      // send all notifications
      sendNotifications(product)
    } else {
      console.log(`${product.name} -- Not in stock`)
    }
    // make sure interval is reset to default after successful scrape
    interval = default_interval
    error_count = 0
  } catch (error) {
    error_count++
    // switch to a 10s interval
    interval = 10000
    // keep checking for a minute before shutting the app down
    if(error_count >= 6) {
      console.error(error)
      notifier.notify({
        title: 'Pretty Stocked Error',
        message: 'Ran into an issue and had to shut down. Check the console for more information and to start again.'
      });
      process.exit(0)
    }
  }

}

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

notifier.notify({
  title: 'Pretty Stocked',
  message: 'Starting Pretty Stocked. You will receive noticataions in the console, system notifications, and if configured, Discord, and Pushbullet.'
});

// continue checking for products at the configuration intervarl
setInterval(function (){
  checkAllProducts()
}, interval)