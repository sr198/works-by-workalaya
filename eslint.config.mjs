import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['**/dist', '**/node_modules', '**/coverage', '**/.nx'],
  },
  ...tseslint.configs.recommended,
  prettierConfig,
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:shared-kernel',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'scope:config',
              onlyDependOnLibsWithTags: ['scope:shared-kernel'],
            },
            {
              sourceTag: 'scope:testing',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config'],
            },
            {
              sourceTag: 'scope:api-contracts',
              onlyDependOnLibsWithTags: ['scope:shared-kernel'],
            },
            {
              sourceTag: 'scope:identity',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:catalog',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:booking',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:discovery',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:payment',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:communication',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:trust',
              onlyDependOnLibsWithTags: ['scope:shared-kernel', 'scope:config', 'scope:api-contracts'],
            },
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: [
                'scope:shared-kernel',
                'scope:config',
                'scope:api-contracts',
                'scope:identity',
                'scope:catalog',
                'scope:booking',
                'scope:discovery',
                'scope:payment',
                'scope:communication',
                'scope:trust',
              ],
            },
            {
              sourceTag: 'scope:worker',
              onlyDependOnLibsWithTags: [
                'scope:shared-kernel',
                'scope:config',
                'scope:identity',
                'scope:catalog',
                'scope:booking',
                'scope:discovery',
                'scope:payment',
                'scope:communication',
                'scope:trust',
              ],
            },
          ],
        },
      ],
    },
  },
];
