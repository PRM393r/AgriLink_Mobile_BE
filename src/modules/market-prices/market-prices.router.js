const router = require('express').Router();
const controller = require('./market-prices.controller');

router.get('/', controller.getMarketPrices);

module.exports = router;
