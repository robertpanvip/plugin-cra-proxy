import {
	pluginCraProxy as craProxyCore,
	type PluginCraProxyOptions,
} from "@plugin-cra-proxy/core";
import type { RsbuildPlugin } from "@rsbuild/core";

export const pluginCraProxy = (
	options?: PluginCraProxyOptions,
): RsbuildPlugin => ({
	name: "plugin-cra-proxy",
	apply: "serve",
	enforce: "post",

	setup(api) {
		api.modifyRsbuildConfig((config) => {
			config.server = config.server ?? {};
			config.server.htmlFallback = false;
			config.dev = config.dev ?? {};
		});
		craProxyCore(options).setup({
			...api,
			modifyConfig: api.modifyRsbuildConfig,
		});
	},
});

export default pluginCraProxy;
