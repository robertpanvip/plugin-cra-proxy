# plugin-cra-proxy

A monorepo project that provides CRA-style proxy support for **Rsbuild** and **Vite**.

> Use API proxy in Rsbuild and Vite development environments just like in Create React App.

## 🎯 Key Features

- ✅ **CRA-style Configuration**: Set the `proxy` field directly in `package.json`
- ✅ **HTTP & WebSocket Proxy**: Support proxying HTTP requests and custom WebSocket connections
- ✅ **Smart HMR Filtering**: Automatically exclude dev server HMR connections to avoid conflicts
- ✅ **Windows Compatibility**: Automatically fix `localhost` loopback issues on Windows
- ✅ **Chrome DevTools Filtering**: Exclude auto-folder feature requests
- ✅ **Multi-framework Support**: Rsbuild v1/v2 and Vite implementations
- ✅ **Middleware Plugin**: Reuse the same proxy logic with independent framework adapters

## 📦 Project Structure

This is a pnpm workspaces monorepo with 3 core packages:

### packages/core
- **npm package**: `@plugin-cra-proxy/core`
- **Purpose**: Core middleware implementation for proxy
- **Main Features**:
  - Read `proxy` field from `package.json`
  - Implement HTTP/WebSocket proxy based on `http-proxy-middleware`
  - Fix Windows localhost issues
  - Provide intelligent request filtering (HMR, DevTools, etc.)

### packages/rsbuild
- **npm package**: `@plugin-cra-proxy/rsbuild`
- **Purpose**: Rsbuild plugin adapter
- **Features**:
  - Compatible with Rsbuild v1 and v2
  - v1 uses `dev.setupMiddlewares`
  - v2 uses `server.setup`
  - Ensure proxy executes after all default middlewares

### packages/vite
- **npm package**: `@plugin-cra-proxy/vite`
- **Purpose**: Vite plugin adapter
- **Features**:
  - Reuse middleware from `@plugin-cra-proxy/core`
  - Compatible with Vite official plugin system

## 🚀 Quick Start

### Using with Rsbuild

```bash
npm add @plugin-cra-proxy/rsbuild -D
```

**rsbuild.config.ts**:
```typescript
import { pluginCraProxy } from "@plugin-cra-proxy/rsbuild";

export default {
  plugins: [pluginCraProxy()],
};
```

**package.json**:
```json
{
  "proxy": "http://localhost:4000"
}
```

### Using with Vite

```bash
npm add @plugin-cra-proxy/vite -D
```

**vite.config.ts**:
```typescript
import { pluginCraProxy } from "@plugin-cra-proxy/vite";

export default {
  plugins: [pluginCraProxy()],
};
```

**package.json**:
```json
{
  "proxy": "http://localhost:4000"
}
```

## 📖 How It Works

1. **Configuration Reading**: The plugin reads the `proxy` field from `package.json` on startup
2. **Middleware Injection**: Inject proxy middleware into the dev server backend
3. **Request Filtering**:
   - ✅ Requests handled by Rsbuild/Vite (static assets, HMR, HTML) pass through normally
   - ✅ DevTools auto-folder requests are filtered
   - ❌ HMR WebSocket connections are not proxied
   - ➜ All other requests are forwarded to the proxy target server
4. **Header Fixing**: Automatically modify the `Origin` header to prevent CORS issues

## 🧪 Test Server

The project provides `4000.js` as a test backend:

```bash
npm run server-4000
```

Available routes:
- `GET /api/user`: Returns JSON data
- `GET /admin`: Returns HTML page
- Other paths: Returns 404

## 📋 Supported Rsbuild Versions

- **Rsbuild v1.x**: Uses `config.dev.setupMiddlewares` API
- **Rsbuild v2.x**: Uses `config.server.setup` API

The plugin automatically adapts based on the `@rsbuild/core` version.

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode (watch file changes)
pnpm dev

# Lint code
pnpm lint

# Fix code format
pnpm lint:write

# Run tests
pnpm test
```

## 📝 License

MIT

## 🤝 Related Resources

- [Rsbuild Official Documentation](https://rsbuild.dev/)
- [Vite Official Documentation](https://vitejs.dev/)
- [Create React App Proxy Documentation](https://create-react-app.dev/docs/proxying-api-requests-in-development/)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
