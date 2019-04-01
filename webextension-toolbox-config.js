const {
    dedupeModules,
    fixZipPackage,
    useCss,
    useExternal,
    useLicenseChecker,
    useSourceMap,
    useTypescript,
} = require('@spadin/webextension-build-utils');

const allowedLicenses = [
    'Apache-2.0',
    'BSD-2-Clause',
    'MIT',
    'MPL-2.0',
    'Zlib',
];

module.exports = {
    webpack: (config, { dev }) => {

        useLicenseChecker(config, allowedLicenses);

        useSourceMap(config, dev);

        useTypescript(config);

        useCss(config, {
            optimizeImages: !dev,
        });

        // Don't bundle certain large modules to speed up build times and allow
        // the browser to cache them between builds.
        const mode = dev ? 'development' : 'production.min';

        useExternal(config, {
            module: 'react',
            global: 'React',
            from: `../node_modules/react/umd/react.${mode}.js`,
            to: 'scripts/react/react.js',
        });

        useExternal(config, {
            module: 'react-dom',
            global: 'ReactDOM',
            from: `../node_modules/react-dom/umd/react-dom.${mode}.js`,
            to: 'scripts/react/react-dom.js',
        });

        const min = dev ? '' : '.min';

        useExternal(config, {
            module: 'react-modal',
            global: 'ReactModal',
            from: `../node_modules/react-modal/dist/react-modal${min}.js`,
            to: 'scripts/react/react-modal.js',
        });

        // Fix for duplicate modules in bundles when some of our dependencies
        // are installed via npm link.
        dedupeModules(config, [
            'webextension-polyfill',
            'webextension-polyfill-ts',
            '@spadin/webextension-storage',
        ]);

        // Workaround for issue in webextension-toolbox v3.0.0:
        // The ZipPlugin added by webextension-toolbox will get run before our
        // CopyPlugin, so the external libraries won't be included in the output
        // package unless we move ZipPlugin to the end of the plugins list.
        fixZipPackage(config);

        // Must return the modified config.
        return config;
    },
    copyIgnore: [
        '**/*.js',
        '**/*.json',
        '**/*.ts',
        '**/*.tsx',
    ],
};
