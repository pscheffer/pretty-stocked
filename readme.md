# Pretty Stocked
A simple node.js scraper for alerting yourself via Pushbullet to rarely stocked goods.

## How it Works
You must configure a json file (example below) with products you wish to scrape. The data provided there allows Pretty Stocked to scrape a given web page, look to see if there is an element on the page that signifies an in-stock product, and will allow Pretty Stocked to send you a notification (to all your devices) via Pushbullet.

## Requirements
* Node and NPM https://nodejs.org/en/download/ (I have only tested this with Node v6.9.5 and NPM v3.10.10 but it should world fine with most versions.)
* A Pushbullet account and access token: https://www.pushbullet.com

## Installation
From the root of the project, run:
```
npm install
```

## Config
For this to run properly, you must have a file called `config.json` at the root of your project. It is not  included in the GIT repo.

```json
{
  "discord_webhook_url": DISCORD_WEBHOOK_URL,
  "pushbullet_token": YOUR_PUSHBULLET_ACCESS_TOKEN,
  "default_interval": DEFAULT_INTERVAL_IN_MS,
  "check_after_found_interval": CHECK_AFTER_FOUND_INTERVAL_IN_MS,
  "products": [
    {
      "name": PRODUCT_NAME,
      "url": PRODUCT_URL,
      "cheerio_selector": SOME_ELEMENT_LENGTH
    }
  ]
}
```
* **pushbullet_token**: If added, will send Pushbullet notifications. Create an access token at: https://www.pushbullet.com/#settings/account
* **discord_webhook_url**: If added, will send Discord notification via a configured webhook
* **default_interval**: Default interview in Milliseconds (be cognisent of the people on the other end, don't spam.) Default value is 5000 milliseconds.
* **products**: Required. Array of objects for Pretty Stocked to search.
    * **name**: String (is used in the Pushbullet notification)
    * **url**: Valid URL for the scraper to search.
    * **cheerio_selector_length**: Valid Cheerio selector for an element that signifies the product is in stock, ie. "Add to Cart" button. Pretty Stoked evaluates the Cheerio selector string as a jQuery object. The expected return is a number. More on Cheerio: https://cheerio.js.org/
    * **request_headers**: Optional. Custom headers for requests.
### Example config.json
```json
{
  "pushbullet_token": "o.983948992384238923u23ew",
  "default_interval": 60000,
  "check_after_found_interval": 3600000,
  "products": [
    {
      "name": "Acer 34\" Ultrawide Monitor",
      "url": "https://acerrecertified.com/acer-um-cx2aa-001-34-xr342ck-bmijpphz-widescreen-lcd-monitor-3440x1440-1k-1/",
      "cheerio_selector_length": "$('button.add-to-cart').length",
      "request_headers": {
        "User-Agent": "Node"
      }
    }
  ]
}
```
Note: that is not a real token.

## Running Pretty Stocked
From the root of the project, run:

```
node index.js
```