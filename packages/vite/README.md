# @plugin-cra-proxy/vite

A development proxy plugin for **Vite** mimicking [Create React App](https://create-react-app.dev/) proxy behavior.

It allows you to:

- Proxy all HTTP requests that are not handled by the dev server.
- Proxy custom WebSocket requests, while ignoring Vite HMR WS connections.
- Automatically fix Windows localhost loopback issues.
- Compatible with both Vite development servers.

<p>
  <a href="https://npmjs.com/package/@plugin-cra-proxy/vite">
   <img src="https://img.shields.io/npm/v/@plugin-cra-proxy/vite?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/@plugin-cra-proxy/vite?minimal=true"><img src="https://img.shields.io/npm/dm/rsbuild-plugin-example.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>

## Usage

Install:

```bash
npm add @plugin-cra-proxy/vite -D
```

Add plugin to your `vite.config.ts`:

```ts
// rsbuild.config.ts
import { pluginCraProxy } from "@plugin-cra-proxy/vite";

export default {
  plugins: [pluginCraProxy()],
};
```

## Options

## License

[MIT](./LICENSE).
