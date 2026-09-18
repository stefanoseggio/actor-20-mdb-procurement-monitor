import prettier from 'eslint-config-prettier';

import apify from '@apify/eslint-config/ts.js';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

// eslint-disable-next-line import-x/no-default-export
export default [
    // mcp/ is a deliberately standalone tool-spec file, outside tsconfig.json's
    // `include` (see that file's comment) - it isn't part of this package's
    // own tsc build, so it's excluded from the type-aware lint project too.
    // examples/ is the same situation: the README's runnable Node.js/Python
    // examples aren't part of src/'s build.
    { ignores: ['**/dist', '**/test', 'eslint.config.mjs', 'mcp/**', 'examples/**'] },
    ...apify,
    prettier,
    {
        languageOptions: {
            parser: tsEslint.parser,
            parserOptions: {
                project: 'tsconfig.json',
            },
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        plugins: {
            '@typescript-eslint': tsEslint.plugin,
        },
        rules: {
            'no-console': 0,
        },
    },
];
