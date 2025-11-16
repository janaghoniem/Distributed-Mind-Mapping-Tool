// ===================================

// server/src/routes/operationRoutes.js
const express = require('express');
const router = express.Router();
const operationController = require('../controllers/operationController');

router.get('/:mapId', operationController.getOperations);
router.get('/:mapId/since/:sequence', operationController.getOperationsSince);
router.get('/:mapId/conflicts', operationController.getConflicts);
router.get('/:mapId/stats', operationController.getOperationStats);
router.get('/operation/:operationId', operationController.getOperation);
router.post('/operation/:operationId/rollback', operationController.rollbackOperation);

module.exports = router;