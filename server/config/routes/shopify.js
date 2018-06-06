/**
 * @file Express router providing user related routes
 * @module routers/users
 * @requires express
 */

/**
 * @type {*|createApplication}
 */
const express = require('express');
const router = express.Router({});
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const dotenv = require('dotenv').config();
const apiKey = process.env.SHOPIFY_APP_KEY;
const apiSecret = process.env.SHOPIFY_APP_SECRET;
const scopes = 'read_products';
const forwardingAddress = 'https://ca58404c.ngrok.io'; // Replace this with your HTTPS Forwarding address

/**
 * Installation route.
 * @function
 */
router.get('/install', (req, res) => {
  if (!req.query.shop) {
    return res.status(400).send(
      'Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request.');
  }

  const state = nonce();
  const redirectUri = forwardingAddress + '/shopify/callback';
  const installUrl = 'https://' + req.query.shop
    + '/admin/oauth/authorize'
    + '?client_id=' + apiKey
    + '&scope=' + scopes
    + '&state=' + state
    + '&redirect_uri=' + redirectUri
  ;

  res.cookie('state', state);

  return res.redirect(installUrl);
});

/**
 * Callback route
 * @function
 */
router.get('/callback', (req, res) => {
  const {shop, hmac, code, state} = req.query;

  if (shop && hmac && code) {
    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];

    const message = querystring.stringify(map);
    const providedHmac = Buffer.from(hmac, 'utf-8');
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('hex'),
      'utf-8'
    );

    let hashEquals = false;

    // timingSafeEqual will prevent any timing attacks. Arguments must be buffers
    try {
      // timingSafeEqual will return an error if the input buffers are not the same length.
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
    }
    catch (e) {
      hashEquals = false;
    }

    if (!hashEquals) {
      return res.status(400).send('HMAC validation failed');
    }

    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
      client_id:     apiKey,
      client_secret: apiSecret,
      code,
    };

    request.post(accessTokenRequestUrl, {json: accessTokenPayload})
      .then((accessTokenResponse) => {
        const accessToken = accessTokenResponse.access_token;

        const shopRequestUrl = 'https://' + shop + '/admin/shop.json';
        const shopRequestHeaders = {
          'X-Shopify-Access-Token': accessToken,
        };

        request.get(shopRequestUrl, {headers: shopRequestHeaders})
          .then((shopResponse) => {
            res.end(shopResponse);
          })
          .catch((error) => {
            res.status(error.statusCode).send(error.error.error_description);
          });
      })
      .catch((error) => {
        res.status(error.statusCode).send(error.error.error_description);
      });
  }
  else {
    res.status(400).send('Required parameters missing');
  }
});

module.exports = router;
