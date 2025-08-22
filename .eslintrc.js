module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'jsx-a11y',
    'react-hooks',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],



    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/named': 'off', // TypeScript handles this
    'import/default': 'off', // TypeScript handles this
    'import/no-named-as-default-member': 'off',
    'import/no-duplicates': 'error',

    // React specific rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/anchor-is-valid': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/heading-has-content': 'error',
    'jsx-a11y/html-has-lang': 'error',
    'jsx-a11y/img-redundant-alt': 'error',
    'jsx-a11y/no-access-key': 'error',
    'jsx-a11y/no-autofocus': 'error',
    'jsx-a11y/no-distracting-elements': 'error',
    'jsx-a11y/no-redundant-roles': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/role-supports-aria-props': 'error',
    'jsx-a11y/tabindex-no-positive': 'error',



    // General code quality rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],
    'no-duplicate-imports': 'error',
    'no-useless-rename': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'max-len': [
      'error',
      {
        code: 100,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines': ['error', 600],
    'max-lines-per-function': ['error', 50],
    'max-params': ['error', 4],
    'max-statements': ['error', 20],
    'no-magic-numbers': [
      'warn',
      {
        ignore: [-1, 0, 1, 2, 3, 4, 5, 10, 100, 1000],
        ignoreArrayIndexes: true,
        detectObjects: false,
      },
    ],

    // Error handling rules
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // Async rules
    'no-async-promise-executor': 'error',
    'no-promise-executor-return': 'error',
    'require-await': 'warn',

    // Variable rules
    'no-unused-vars': 'off', // Handled by TypeScript
    'no-undef': 'error',
    'no-use-before-define': ['error', { functions: false, classes: true }],

    // Function rules
    'func-style': ['error', 'expression'],
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-confusing-arrow': 'error',

    // Object rules
    'object-curly-spacing': ['error', 'always'],
    'object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],

    // Array rules
    'array-bracket-spacing': ['error', 'never'],
    'array-element-newline': ['error', 'consistent'],

    // String rules
    'quotes': ['error', 'single', { avoidEscape: true }],
    'jsx-quotes': ['error', 'prefer-double'],
    'no-useless-concat': 'error',
    'prefer-template': 'error',

    // Number rules
    'no-loss-of-precision': 'error',
    'no-unsafe-optional-chaining': 'error',

    // Logic rules
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-duplicate-case': 'error',
    'no-fallthrough': 'error',
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',

    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'default-case': 'error',
    'default-case-last': 'error',
    'dot-notation': 'error',
    'no-caller': 'error',
    'no-else-return': 'error',
    'no-empty-function': 'error',
    'no-eq-null': 'error',
    'no-extra-bind': 'error',
    'no-extra-label': 'error',
    'no-floating-decimal': 'error',
    'no-global-assign': 'error',
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-implied-eval': 'error',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-spaces': 'error',
    'no-multi-str': 'error',
    'no-new': 'error',
    'no-new-wrappers': 'error',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    'no-param-reassign': 'error',
    'no-proto': 'error',
    'no-return-assign': 'error',
    'no-return-await': 'error',
    'no-script-url': 'error',
    'no-self-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-catch': 'error',
    'no-useless-concat': 'error',
    'no-useless-escape': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'no-warning-comments': 'warn',
    'prefer-named-capture-group': 'error',
    'prefer-promise-reject-errors': 'error',
    'radix': 'error',
    'require-await': 'warn',

    'vars-on-top': 'error',
    'wrap-iife': 'error',
    'yoda': 'error',
  },
  overrides: [
    {
      // Rules for test files
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      // Rules for configuration files
      files: ['*.config.js', '*.config.ts', 'next.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
    {
      // Rules for API routes
      files: ['app/api/**/*.ts'],
      rules: {
        'no-console': 'warn',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'dist/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
  ],
};
