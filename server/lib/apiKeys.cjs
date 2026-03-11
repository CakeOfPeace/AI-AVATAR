const crypto = require('crypto');

/**
 * Generates a new API key
 * Format: sk_live_<48 hex chars>
 */
const generateApiKey = () => {
  const prefix = 'sk_live_';
  // 24 bytes = 48 hex chars
  const randomPart = crypto.randomBytes(24).toString('hex');
  const key = `${prefix}${randomPart}`;
  
  // Store prefix for UI display (e.g. sk_live_a1b2...)
  const displayPrefix = key.substring(0, 12) + '...';
  
  // Hash the key for storage
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  return {
    key,
    hash,
    prefix: displayPrefix
  };
};

/**
 * Hashes an API key for comparison
 */
const hashKey = (key) => {
    return crypto.createHash('sha256').update(key).digest('hex');
};

module.exports = { generateApiKey, hashKey };
