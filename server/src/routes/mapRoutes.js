// server/src/routes/mapRoutes.js
const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

router.post('/', mapController.createMap);
router.get('/', mapController.getMaps);
router.get('/:mapId', mapController.getMap);
router.put('/:mapId', mapController.updateMap);
router.delete('/:mapId', mapController.deleteMap);
router.get('/:mapId/stats', mapController.getMapStats);

module.exports = router;


