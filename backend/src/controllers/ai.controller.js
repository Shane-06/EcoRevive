const ecoGuideService = require('../services/ai/ecoGuide.service');
const { setupClientDisconnect } = require('../integrations/ai');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Handles conversational queries to EcoGuide.
 * @route POST /api/v1/ai/chat
 */
const chatWithEcoGuide = async (req, res, next) => {
  const { signal, cleanup } = setupClientDisconnect(res);

  try {
    const { message, history } = req.body || {};

    const result = await ecoGuideService.chat({
      message,
      history,
      user: req.user,
      signal,
    });

    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  } finally {
    cleanup();
  }
};

module.exports = {
  chatWithEcoGuide,
};
