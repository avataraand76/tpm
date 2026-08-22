import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],

      // Giao dien phai di qua src/ui va src/theme, khong import truc tiep MUI
      // hay tu goi useMediaQuery. Xem src/ui/index.js va src/hooks/useResponsive.js
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@mui/material',
            importNames: ['useTheme', 'useMediaQuery'],
            message: 'Dung useResponsive() tu "src/ui" thay vi tu goi useMediaQuery.',
          },
          {
            name: '@mui/material/useMediaQuery',
            message: 'Dung useResponsive() tu "src/ui".',
          },
        ],
        patterns: [
          {
            group: ['@mui/material/styles'],
            importNames: ['useTheme'],
            message: 'Dung const { theme } = useResponsive() tu "src/ui".',
          },
        ],
      }],
    },
  },
  {
    // Cac file BEN TRONG design system duoc phep import truc tiep MUI
    files: ['src/theme/**', 'src/hooks/**', 'src/ui/**', 'src/components/ui/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
])
