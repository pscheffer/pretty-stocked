require('dotenv').config();
const cheerio = require('cheerio')
const pushbullet = require('pushbullet')
const fs = require('fs')
const sa = require('superagent')
const notifier = require('node-notifier') 

// requires environment variables for pushbullet and discord
const config = {
  discord_urls: process.env.DISCORD_WEBHOOK_URL.split('||') || [],
  pushbullet_token: process.env.PUSHBULLET_TOKEN || '',
  default_interval: process.env.DEFAULT_INTERVAL || 5000,
  recheck_interval_ms: process.env.CHECK_AFTER_FOUND_INTERVAL || 3600000
}

// interval can be overridden
var interval = config.default_interval
// default is 1 hr
var error_count = 0

var pusher = false
// if pushbullet exists, configure it
if(config.pushbullet_token) {
  pusher = new pushbullet(config.pushbullet_token)
}

// load the required config.json file from the root of the project
const products = JSON.parse(fs.readFileSync('products.json'))

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
    for(var i = 0; i < discord_urls.length; i++) {
      var webhook_response = await sa.post(discord_urls[i])
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
      
      console.log(webhook_response)
    }
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

  if(config.discord_urls) {
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
    // check if there is an add to cart button on the page\
    var cheerio_required_length = product.cheerio_selector_required_length || 1
    if (typeof cheerio_selector_length !== 'undefined' && cheerio_selector_length === cheerio_required_length) {
      // lets skip this sucker for the rest of the time since we've found it
      products[product_index].found_ts = new Date().getTime()
      // send all notifications
      await sendNotifications(product)
    } else {
      products[product_index].found_ts = 0
      console.log(`${product.name} -- Not in stock`)
    }
    // make sure interval is reset to default after successful scrape
    interval = config.default_interval
    error_count = 0
  } catch (error) {
    error_count++
    // switch to a 10s interval
    interval = 10000
    // keep checking for a minute before shutting the app down
    if(error_count >= 10) {
      console.error(error)
      notifier.notify({
        title: 'Pretty Stocked Error',
        message: 'Ran into an issue and had to shut down. Check the console for more information and to start again.'
      });
    }
  }

}

// check each product to see if its in stock
const checkAllProducts = () => {
  if(products.length > 0) {
    for(var i = 0; i < products.length; i++) {
      if(typeof products[i].found_ts === 'undefined') {
        products[i].found_ts = 0
      }
      var product = products[i];
      if(products[i].found_ts === 0) {
        checkStock(product, i)
      } else {
        // current timestamp in ms
        var current_ts = new Date().getTime()
        // subtract since found to get ts
        var time_diff = current_ts - product.found_ts

        // compare whether to check
        if(time_diff > config.recheck_interval_ms) {
          checkStock(product, i)
        } else {
          console.log('Skipping ' + product.name)
        }
      }
    }
  }
}

const starting_msg = 'Starting Pretty Stocked. You will receive noticataions in the console, system notifications, and if configured, Discord, and Pushbullet.';

notifier.notify({
  title: 'Pretty Stocked',
  message: starting_msg
});

if(config.pushbullet_token && pusher) {
  // lets push to pusher
  pusher.note({}, 'Pretty Stocked', starting_msg, function(error, response) {
    if(error) {
      console.log(error)
    }
  });
}

// continue checking for products at the configuration intervarl
setInterval(function (){
  checkAllProducts()
}, interval)