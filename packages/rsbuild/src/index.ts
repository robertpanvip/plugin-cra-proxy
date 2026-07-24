import { createMiddleware } from "@plugin-cra-proxy/core";
import type {
	EnvironmentContext,
	RsbuildDevServer,
	RsbuildPlugin,
	RsbuildPreviewServer,
} from "@rsbuild/core";
import { version } from "@rsbuild/core";

type ServerSetupContext = {
	environments: Record<string, EnvironmentContext>;
} & (
	| {
			action: "dev";
			server: RsbuildDevServer;
	  }
	| {
			action: "preview";
			server: RsbuildPreviewServer;
	  }
);

const isVersion1 = version.startsWith("1.");

export type PluginCraProxyOptions = {
	/**
	 * 代理目标地址。优先级高于 package.json 中的 "proxy" 字段。
	 */
	proxy?: string;
};

export const pluginCraProxy = (
	options: PluginCraProxyOptions = {},
): RsbuildPlugin => ({
	name: "plugin-cra-proxy",

	apply: "serve",

	enforce: "post",

	setup(api) {
		// 现在使用 Rsbuild v2 的 server.setup 来配置
		api.modifyRsbuildConfig((config) => {
			config.server = config.server ?? {};
			config.server.htmlFallback = false;
			config.dev = config.dev ?? {};
			const mw = createMiddleware({
				proxy: options.proxy,
				get hmr() {
					return api.getNormalizedConfig().dev?.client?.path;
				},
				logger: api.logger,
			});
			if (!isVersion1) {
				const userSetup = config.server.setup;
				// 我们的 proxy setup 函数
				const proxySetup = (context: ServerSetupContext) => {
					// 返回回调，在默认中间件注册后执行
					return () => {
						if (mw) {
							context.server.middlewares.use(mw);
						}
					};
				};
				// 组合用户配置和我们的配置
				if (Array.isArray(userSetup)) {
					config.server.setup = [...userSetup, proxySetup];
				} else if (typeof userSetup === "function") {
					config.server.setup = [userSetup, proxySetup];
				} else {
					config.server.setup = proxySetup;
				}
			} else {
				// ✨ 使用 config.dev.setupMiddlewares
				config.dev ??= {};
				const userSetup = config.dev?.setupMiddlewares;

				config.dev.setupMiddlewares = (middlewares, devServer) => {
					// 调回用户原有的（如果有）
					if (typeof userSetup === "function") {
						userSetup(middlewares, devServer);
					} else if (Array.isArray(userSetup)) {
						userSetup.forEach((setup) => {
							typeof setup === "function" && setup(middlewares, devServer);
						});
					}

					/**
					 * 💡 插入到最后面
					 * 保证 rsbuild 默认的静态资源 / HMR / HTML 都先处理
					 * 剩下所有请求交给 proxyMw
					 */
					mw && middlewares.push(mw);
				};
			}
		});
	},
});

export default pluginCraProxy;
