// Signs Android release builds with the Closebuy upload key when the CI provides it
// (CLOSEBUY_KEYSTORE, CLOSEBUY_KEYSTORE_PASSWORD, CLOSEBUY_KEY_ALIAS, CLOSEBUY_KEY_PASSWORD), and sets the
// version code from CLOSEBUY_VERSION_CODE. Without them, release builds use the debug key (fine for testing).
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        closebuyUpload {
            if (System.getenv('CLOSEBUY_KEYSTORE')) {
                storeFile file(System.getenv('CLOSEBUY_KEYSTORE'))
                storePassword System.getenv('CLOSEBUY_KEYSTORE_PASSWORD')
                keyAlias System.getenv('CLOSEBUY_KEY_ALIAS')
                keyPassword System.getenv('CLOSEBUY_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes('closebuyUpload')) return cfg;
    g = g.replace(/signingConfigs\s*\{/, (m) => `${m}${SIGNING}`);
    // In the release build type, use the upload key when present.
    g = g.replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, `$1signingConfig(System.getenv('CLOSEBUY_KEYSTORE') ? signingConfigs.closebuyUpload : signingConfigs.debug)`);
    g = g.replace(/versionCode\s+\d+/, (m) => `versionCode((System.getenv('CLOSEBUY_VERSION_CODE') ?: '${m.split(/\s+/)[1]}').toInteger())`);
    cfg.modResults.contents = g;
    return cfg;
  });
};
