/**
 * Sets up verified client-disconnect cancellation on the Express HTTP response object.
 *
 * CRITICAL STREAM DISTINCTION:
 * In Express, incoming request bodies emit req.on('end') when body reading completes.
 * Normal incoming request body completion must NEVER be treated as a client disconnect.
 *
 * Disconnection is detected on the outgoing response stream ('close' event on res),
 * guarded by the res.writableEnded property.
 *
 * - Normal Flow: When generation completes, res.send()/sendSuccess() writes the response
 *   and ends the stream (res.writableEnded = true). When the underlying TCP socket subsequently
 *   closes or returns to the keep-alive pool, res.writableEnded is true, so NO abort is triggered.
 *
 * - Abnormal Disconnect Flow: If the client closes the connection, browser tab, or terminates
 *   the request before the response finishes writing, the socket closes while res.writableEnded === false.
 *   The listener intercepts this genuine client disconnect and dispatches controller.abort('CLIENT_DISCONNECTED').
 *
 * @param {import('express').Response} res - Express response stream
 * @param {AbortController} [existingController] - Optional existing AbortController
 * @returns {{ controller: AbortController, signal: AbortSignal, cleanup: Function }}
 */
function setupClientDisconnect(res, existingController = null) {
  const controller = existingController || new AbortController();

  const onClientDisconnect = () => {
    // Only abort if the socket closed BEFORE the response was finished writing
    if (res && !res.writableEnded) {
      controller.abort('CLIENT_DISCONNECTED');
    }
  };

  if (res && typeof res.on === 'function') {
    res.on('close', onClientDisconnect);
  }

  const cleanup = () => {
    if (res && typeof res.removeListener === 'function') {
      res.removeListener('close', onClientDisconnect);
    }
  };

  return {
    controller,
    signal: controller.signal,
    cleanup,
  };
}

module.exports = {
  setupClientDisconnect,
};
