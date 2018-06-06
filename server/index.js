/**
 * @file Entrypoint for requests from Shopify to our app.
 *
 * @see https://help.shopify.com/api/tutorials/building-node-app
 */
const express = require('express');
const app = express();
const shopifyRoutes = require('./config/routes/shopify');

//-------------------------------------------------------------------------------
// Define Routes
//-------------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/shopify', shopifyRoutes);

//-------------------------------------------------------------------------------
// Serve requests to the above routes
//-------------------------------------------------------------------------------
app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});
