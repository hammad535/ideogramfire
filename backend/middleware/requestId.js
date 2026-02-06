/** Assigns req.id for error correlation; safe to use in logs and API responses. */
const crypto = require('crypto');
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || `req-${crypto.randomBytes(8).toString('hex')}`;
  next();
}
module.exports = { requestId };
