import { FlatCompat } from '@eslint/eslintrc'
import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

const compat = new FlatCompat()

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['node_modules', 'dist', 'out', '.git', 'scripts']
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  ...compat.extends('plugin:prettier/recommended'),
  // ...compat.extends('plugin:react-hooks/recommended'),
  {
    files: [
      '**/*.jsx',
      '**/*.tsx',
      '**/*.mjs',
      '**/*.mts',
      '**/*.cjs',
      '**/*.cts',
      '**/*.ts',
      '**/*.js'
    ],
    rules: {
      'no-debugger': 'warn',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': ['off'],
      '@typescript-eslint/no-empty-object-type': ['off'],
      '@typescript-eslint/ban-ts-comment': ['off'],
      '@typescript-eslint/no-unused-vars': [
        'off',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }
      ]
    }
  }
]
