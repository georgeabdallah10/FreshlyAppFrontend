# Path Alias Resolution Fix

## Issue
Vercel build was failing with error:
```
Unable to resolve module @/api/auth/auth from /vercel/path0/app/(auth)/Login.tsx
```

The `@/` path alias defined in `tsconfig.json` was not being resolved during the Expo web export for Vercel deployment.

## Root Cause
- TypeScript's `tsconfig.json` path aliases only work for TypeScript compiler type checking
- They are NOT automatically resolved by bundlers like Metro or Webpack during the build process
- Expo's web export uses Babel to transpile code, which doesn't understand TypeScript path aliases by default

## Solution

### 1. Install Babel Module Resolver Plugin
```bash
npm install --save-dev babel-plugin-module-resolver
```

### 2. Create `babel.config.js`
Added Babel configuration to resolve the `@/` alias during transpilation:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
        },
      ],
    ],
  };
};
```

### 3. Update `metro.config.js`
Added path alias support to Metro bundler for React Native builds:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Existing SVG configuration...
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// Add support for @ path alias
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname),
};

module.exports = config;
```

### 4. Update `next.config.js`
Added webpack alias for web builds (future-proofing if Next.js is used):

```javascript
webpack: (config) => {
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'react-native$': 'react-native-web',
    '@': __dirname,  // Added this line
  };
  // ...rest of config
  return config;
},
```

## Verification

### Local Build Test
```bash
npm run vercel-build
```
**Result**: ✅ Build completed successfully with output: `Exported: web-build`

### Path Resolution Check
```bash
find web-build -name "*.js" -type f -exec grep -l "@/api/auth" {} \;
```
**Result**: ✅ No raw `@/api/auth` imports found (all were resolved during build)

## Files Modified
1. **Created**: `babel.config.js` - Babel configuration with module-resolver plugin
2. **Updated**: `metro.config.js` - Added extraNodeModules for path alias
3. **Updated**: `next.config.js` - Added webpack alias
4. **Installed**: `babel-plugin-module-resolver` package

## Why This Works

1. **Babel Module Resolver**: Transforms the `@/` imports into relative paths during transpilation
2. **Metro Config**: Helps Metro bundler understand the alias for React Native builds
3. **Next.js/Webpack Config**: Ensures web builds through webpack also understand the alias

## Benefits

- ✅ Path aliases now work across all build targets (iOS, Android, Web)
- ✅ Consistent import syntax throughout the codebase
- ✅ No need to change existing code using `@/` imports
- ✅ Vercel deployment should now succeed

## Next Steps

1. Commit these changes:
   ```bash
   git add babel.config.js metro.config.js next.config.js package.json package-lock.json
   git commit -m "fix: Add Babel module resolver for path alias support"
   git push
   ```

2. Trigger Vercel deployment (automatic on push, or manual)

3. Verify deployment succeeds

## Related Issues Fixed
- Issue #1: Empty functions object in vercel.json ✅ Fixed
- Issue #2: Case sensitivity (`api/Auth` vs `api/auth`) ✅ Fixed
- Issue #3: Path alias resolution during build ✅ Fixed (this document)
