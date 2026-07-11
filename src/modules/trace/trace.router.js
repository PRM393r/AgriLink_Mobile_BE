const router = require('express').Router();
const controller = require('./trace.controller');

router.get('/:code', controller.getTraceByCode);

module.exports = router;
