// server/src/routes/graphRoutes.js
const express = require('express');
const router = express.Router();
const GraphController = require('../controllers/graphController');

// Validation endpoints
router.get('/:mapId/validate', GraphController.validateGraph);
router.post('/:mapId/validate/operation', GraphController.validateOperation);
router.post('/:mapId/fix', GraphController.applyFixes);

// Statistics and analysis
router.get('/:mapId/stats', GraphController.getStats);
router.get('/:mapId/orphans', GraphController.findOrphans);
router.get('/:mapId/cycles', GraphController.detectCycles);
router.get('/:mapId/components', GraphController.getComponents);

// Node relationships
router.get('/:mapId/node/:nodeId/descendants', GraphController.getDescendants);
router.get('/:mapId/node/:nodeId/ancestors', GraphController.getAncestors);

// Layout operations
router.post('/:mapId/layout', GraphController.applyLayout);

// Edge validation
router.post('/:mapId/edge/check-cycle', GraphController.checkCycle);

module.exports = router;