import {
	pluginCraProxy as craProxyCore,
	type HookConfig,
	type PluginCraProxyOptions,
	type SetupMiddlewaresFn,
} from "@plugin-cra-proxy/core";
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
export const pluginCraProxy = (
	options?: PluginCraProxyOptions,
): RsbuildPlugin => ({
	name: "plugin-cra-proxy",
	apply: "serve",
	enforce: "post",

	setup(api) {
		const proxyMiddlewares: SetupMiddlewaresFn[] = [];

		// 创建临时 config 对象，用来拦截 core 包调用 modifyConfig 时写入的 setupMiddlewares
		const tempConfig: HookConfig = {
			dev: {
				get client(){
					return api.getNormalizedConfig().dev.client
				},
			},
		};

		// 先让 core 包执行，把它想写的 setupMiddlewares 写到 tempConfig 中
		craProxyCore(options).setup(
			isVersion1
				? {
						...api,
						modifyConfig: api.modifyRsbuildConfig,
					}
				: {
						...api,
						getNormalizedConfig: () => tempConfig,
						modifyConfig: (fn) => fn(tempConfig),
					},
		);

		// 现在，tempConfig.dev.setupMiddlewares 应该已经被 core 包设置了
		// 我们手动执行它，把 proxy middleware 收集出来
		const setupMiddlewares = tempConfig.dev?.setupMiddlewares;
		if (typeof setupMiddlewares === "function") {
			// 模拟 middlewares 接口，只需要 push 和 unshift 方法
			const middlewaresCollector: {
				push: (...handlers: any[]) => void;
				unshift: (...handlers: any[]) => void;
			} = {
				push: (...handlers) => proxyMiddlewares.push(...handlers),
				unshift: (...handlers) => proxyMiddlewares.unshift(...handlers),
			};
			// 执行 setupMiddlewares，把 core 包要加的中间件都收集出来
			setupMiddlewares(middlewaresCollector, {});
		}

		// 现在使用 Rsbuild v2 的 server.setup 来配置
		api.modifyRsbuildConfig((config) => {
			config.server = config.server ?? {};
			config.server.htmlFallback = false;
			config.dev = config.dev ?? {};
			if (!isVersion1) {
				const userSetup = config.server.setup;

				// 我们的 proxy setup 函数
				const proxySetup = (context: ServerSetupContext) => {
					// 返回回调，在默认中间件注册后执行
					return () => {
						proxyMiddlewares.forEach((mw) => {
							context.server.middlewares.use(mw);
						});
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
			}
		});
	},
});

export default pluginCraProxy;
