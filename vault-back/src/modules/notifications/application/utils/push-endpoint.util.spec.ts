import { isAllowedPushEndpoint } from './push-endpoint.util.js';

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc123',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGx1',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('accepts official push service %s', (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://169.254.169.254/latest/meta-data',
    'http://vault-backend.vault-prod.svc.cluster.local/health',
    'https://fcm.googleapis.com.evil.com/x',
    'https://evilfcm.googleapis.com.attacker.io/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'not a url',
    42,
  ])('rejects %s', (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false);
  });
});
