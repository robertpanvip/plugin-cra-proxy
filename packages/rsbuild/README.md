# @plugin-cra-proxy/rsbuild

A development proxy plugin for **Rsbuild**, mimicking [Create React App](https://create-react-app.dev/) proxy behavior.

It allows you to:

- Proxy all HTTP requests that are not handled by the dev server.
- Proxy custom WebSocket requests, while ignoring Vite HMR WS connections.
- Automatically fix Windows localhost loopback issues.
- Compatible with Rsbuild development servers.

<p>
  <a href="https://npmjs.com/package/@plugin-cra-proxy/rsbuild">
   <img src="https://img.shields.io/npm/v/@plugin-cra-proxy/rsbuild?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/@plugin-cra-proxy/rsbuild?minimal=true"><img src="https://img.shields.io/npm/dm/rsbuild-plugin-example.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>

## Usage

Install:

```bash
npm add @plugin-cra-proxy/rsbuild -D
```

Add plugin to your `rsbuild.config.ts`:

```ts
// rsbuild.config.ts
import { pluginCraProxy } from "@plugin-cra-proxy/rsbuild";

export default {
  plugins: [pluginCraProxy()],
};
```

## Options

## License

[MIT](./LICENSE).
