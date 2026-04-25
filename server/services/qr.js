const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a QR code for a registration.
 * @param {string} registrationId
 * @param {string} eventId
 * @returns {Promise<{ token: string, qrDataUrl: string }>}
 */
const generateQR = async (registrationId, eventId) => {
  const token = uuidv4();
  const payload = JSON.stringify({
    regId: registrationId,
    eventId,
    token,
    ts: Date.now(),
  });

  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
    color: {
      dark: '#0D0F1A',
      light: '#FFFFFF',
    },
  });

  return { token, qrDataUrl };
};

/**
 * Parse QR payload string back to object.
 */
const parseQRPayload = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

module.exports = { generateQR, parseQRPayload };
