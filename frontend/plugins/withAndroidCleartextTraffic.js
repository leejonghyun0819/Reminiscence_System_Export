const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/**
 * The current FastAPI server is served over HTTP during local beta testing.
 * Android 9+ blocks cleartext traffic by default, so generated preview builds
 * must explicitly allow it. Remove this plugin when the production API uses HTTPS.
 */
module.exports = function withAndroidCleartextTraffic(config) {
    return withAndroidManifest(config, (androidConfig) => {
        const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
            androidConfig.modResults,
        );
        application.$['android:usesCleartextTraffic'] = 'true';
        return androidConfig;
    });
};
