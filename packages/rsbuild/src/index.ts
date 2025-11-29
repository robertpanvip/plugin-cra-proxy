import {
  pluginCraProxy as craProxyCore,
  type PluginCraProxyOptions,
} from '@plugin-cra-proxy/core';
import type { RsbuildPlugin } from '@rsbuild/core';

export const pluginCraProxy = (
  options?: PluginCraProxyOptions,
): RsbuildPlugin => ({
  name: 'plugin-cra-proxy',

  setup(api) {
    craProxyCore(options).setup({
      ...api,
      modifyConfig: api.modifyRsbuildConfig,
    });
  },
});

export default pluginCraProxy;
