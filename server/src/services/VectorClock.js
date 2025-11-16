// server/src/services/vectorClock.js
// Vector clock implementation for causal ordering of operations

/**
 * Vector clock tracks logical time for each client
 * Format: { clientId: sequenceNumber }
 */

class VectorClockService {
  /**
   * Create a new vector clock
   */
  create() {
    return new Map();
  }

  /**
   * Increment the clock for a specific client
   */
  increment(vectorClock, clientId) {
    const current = vectorClock.get(clientId) || 0;
    vectorClock.set(clientId, current + 1);
    return vectorClock;
  }

  /**
   * Merge two vector clocks (take maximum for each client)
   */
  merge(clock1, clock2) {
    const merged = new Map(clock1);
    
    for (const [clientId, value] of clock2.entries()) {
      const current = merged.get(clientId) || 0;
      merged.set(clientId, Math.max(current, value));
    }
    
    return merged;
  }

  /**
   * Compare two vector clocks
   * Returns:
   *  - 'before': clock1 happened before clock2
   *  - 'after': clock1 happened after clock2
   *  - 'concurrent': clocks are concurrent (conflict possible)
   *  - 'equal': clocks are equal
   */
  compare(clock1, clock2) {
    let clock1Greater = false;
    let clock2Greater = false;

    // Get all client IDs from both clocks
    const allClients = new Set([
      ...clock1.keys(),
      ...clock2.keys()
    ]);

    for (const clientId of allClients) {
      const val1 = clock1.get(clientId) || 0;
      const val2 = clock2.get(clientId) || 0;

      if (val1 > val2) {
        clock1Greater = true;
      } else if (val2 > val1) {
        clock2Greater = true;
      }
    }

    if (clock1Greater && clock2Greater) {
      return 'concurrent'; // Concurrent operations
    } else if (clock1Greater) {
      return 'after'; // clock1 happened after clock2
    } else if (clock2Greater) {
      return 'before'; // clock1 happened before clock2
    } else {
      return 'equal'; // Same logical time
    }
  }

  /**
   * Check if clock1 happened before clock2
   */
  happenedBefore(clock1, clock2) {
    return this.compare(clock1, clock2) === 'before';
  }

  /**
   * Check if two clocks are concurrent
   */
  areConcurrent(clock1, clock2) {
    return this.compare(clock1, clock2) === 'concurrent';
  }

  /**
   * Convert Map to plain object for storage
   */
  toObject(vectorClock) {
    return Object.fromEntries(vectorClock);
  }

  /**
   * Convert plain object to Map
   */
  fromObject(obj) {
    return new Map(Object.entries(obj || {}));
  }

  /**
   * Get the sequence number for a specific client
   */
  getSequence(vectorClock, clientId) {
    return vectorClock.get(clientId) || 0;
  }

  /**
   * Create a string representation of vector clock
   */
  toString(vectorClock) {
    const entries = Array.from(vectorClock.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([id, val]) => `${id}:${val}`)
      .join(', ');
    
    return `{${entries}}`;
  }

  /**
   * Check if operation is causally ready to be applied
   * (all dependencies have been applied)
   */
  isCausallyReady(operationClock, currentClock) {
    // Operation is ready if its clock is not after current clock
    const comparison = this.compare(operationClock, currentClock);
    return comparison === 'before' || comparison === 'equal';
  }
}

module.exports = new VectorClockService();