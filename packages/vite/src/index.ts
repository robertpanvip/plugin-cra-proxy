import {
  pluginCraProxy as craProxyCore,
  type HookConfig,
  type PluginCraProxyOptions,
} from '@plugin-cra-proxy/core';
import type { RequestHandler } from 'http-proxy-middleware';
import type { Connect, Plugin } from 'vite';

export const pluginCraProxy = (options?: PluginCraProxyOptions): Plugin => ({
  name: 'plugin-cra-proxy',
  enforce: 'post',
  apply: 'serve',
  config: (config) => {
    config.appType = 'mpa';
  },
  configureServer(server) {
    const hmr =
      typeof server.config.server.hmr === 'object'
        ? server.config.server.hmr?.path
        : '/';
    const config: HookConfig = {
      dev: {
        client: {
          path: hmr,
        },
      },
    };
    craProxyCore(options).setup({
      logger: {
        start: server.config.logger.info,
        error: server.config.logger.error,
      },
      getNormalizedConfig: () => config,
      modifyConfig: (fn) => fn(config),
    });
    const middlewares: RequestHandler[] = [];
    // biome-ignore lint/style/noNonNullAssertion: !
    const setupMiddlewares = config.dev!.setupMiddlewares;
    if (typeof setupMiddlewares === 'function') {
      setupMiddlewares(middlewares, {});
    }

    const use = server.middlewares.use;
    server.middlewares.use = function (
      type: Connect.HandleFunction | string,
      fn: Connect.HandleFunction,
    ) {
      const name = typeof type === 'function' ? type?.name : fn.name;

      if (name === 'vite404Middleware') {
        middlewares.forEach((mw) => {
          server.middlewares.use(mw);
          server.httpServer?.on('upgrade', mw.upgrade);
        });
      }
      // @ts-expect-error
      return use.call(this, type as string, fn);
    } as typeof use;
  },
});

export default pluginCraProxy;
