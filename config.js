// UUID fallback for local-network HTTP access.
if (
  globalThis.crypto &&
  typeof globalThis.crypto.randomUUID !== 'function' &&
  typeof globalThis.crypto.getRandomValues === 'function'
) {
  globalThis.crypto.randomUUID = function () {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  };
}

// Change this value to use another Laravel backend. Use the same hostname for both apps.
window.API_BASE_URL = 'http://91.144.16.26:1001/api';