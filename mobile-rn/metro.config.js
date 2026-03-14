const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'cjs', 'mjs', 'json', 'web.tsx', 'web.ts', 'web.jsx', 'web.js'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
        return {
            type: 'sourceFile',
            filePath: require.resolve('./app/MapComponent.web.tsx')
        };
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
