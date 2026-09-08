const QRCode = require('qrcode');
const config = require('../config');

/**
 * Builds the canonical public profile URL for a verified Tree ID.
 * @param {string} treeId - Authoritative Tree ID (e.g. 'ER-PLT-00001')
 * @returns {string} Public profile URL
 */
const buildTreeProfileUrl = (treeId) => {
  const base = config.appUrl.replace(/\/+$/, '');
  return `${base}/tree/${encodeURIComponent(treeId)}`;
};

/**
 * Generates a QR Code as a Data URL (base64 image).
 * @param {string} content - Text/URL to encode
 * @param {object} [options] - QRCode generation options
 * @returns {Promise<string>} Data URL string (data:image/png;base64,...)
 */
const generateQrDataUrl = async (content, options = {}) => {
  return QRCode.toDataURL(content, {
    margin: 2,
    scale: 6,
    errorCorrectionLevel: 'M',
    ...options,
  });
};

/**
 * Generates a QR Code as an SVG XML string.
 * @param {string} content - Text/URL to encode
 * @param {object} [options] - QRCode generation options
 * @returns {Promise<string>} SVG string
 */
const generateQrSvg = async (content, options = {}) => {
  return QRCode.toString(content, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    ...options,
  });
};

/**
 * Builds the canonical QR data payload for a verified tree.
 * @param {string} treeId - Authoritative Tree ID
 * @returns {Promise<{treeId: string, profileUrl: string, qrDataUrl: string}>}
 */
const generateTreeQrPayload = async (treeId) => {
  const profileUrl = buildTreeProfileUrl(treeId);
  const qrDataUrl = await generateQrDataUrl(profileUrl);

  return {
    treeId,
    profileUrl,
    qrDataUrl,
  };
};

module.exports = {
  buildTreeProfileUrl,
  generateQrDataUrl,
  generateQrSvg,
  generateTreeQrPayload,
};
