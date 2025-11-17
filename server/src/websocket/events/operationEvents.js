const GraphValidator = require('../../services/graphValidator');

const handleOperation = async (socket, operation) => {
  try {
    // Validate operation BEFORE applying
    const validation = await GraphValidator.validateOperation(
      operation, 
      socket.mapId
    );
    
    if (!validation.valid) {
      socket.emit('operation:error', {
        operationId: operation.id,
        errors: validation.errors
      });
      return;
    }
    
    // Apply operation
    // ... existing operation logic ...
    
    // Broadcast to other clients
    socket.broadcast.to(socket.mapId).emit('operation:applied', operation);
    
  } catch (error) {
    console.error('Operation failed:', error);
    socket.emit('operation:error', {
      operationId: operation.id,
      error: error.message
    });
  }
};

module.exports = { handleOperation };