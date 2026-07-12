const router = require('express').Router();
const ctrl = require('./geography.controller');

router.get('/provinces', ctrl.getProvinces);
router.get('/districts', ctrl.getDistricts);

module.exports = router;
