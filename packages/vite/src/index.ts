import {
	pluginCraProxy as craProxyCore,     // 核心实现（真正创建 proxy middleware 的部分）
	type HookConfig,
	type PluginCraProxyOptions,
} from "@plugin-cra-proxy/core";
import type { RequestHandler } from "http-proxy-middleware";
import type { Plugin } from "vite";

/**
 * Vite 插件：完美复刻 Create React App 的 package.json "proxy" 功能
 * 使用方式和 CRA 完全一致，只需要在 package.json 中写一行：
 *   "proxy": "http://localhost:5000"
 * 无需任何 vite.config.ts 配置
 */
export const pluginCraProxy = (options?: PluginCraProxyOptions): Plugin => ({
	name: "plugin-cra-proxy",

	// 放在最后执行，确保其他插件（如 rsbuild/vite 自己的配置）已经完成
	enforce: "post",

	// 只在开发服务器时生效
	apply: "serve",

	/**
	 * 强制把 appType 改成 "mpa"（多页应用）
	 * 原因是 @plugin-cra-proxy/core 内部会基于此判断是否走 CRA 风格的 middleware 插入逻辑
	 * 虽然有点“强行修改配置”，但目前是兼容性最好的做法
	 */
	config: (config) => {
		config.appType = "mpa";
	},

	/**
	 * Vite 开发服务器启动后执行的钩子
	 */
	configureServer(server) {
		// 获取 Vite HMR 的 WebSocket 路径（默认可能是 /@vite/client、/__vite_hmr 等）
		const hmr =
			typeof server.config.server.hmr === "object"
				? server.config.server.hmr?.path ?? "/"
				: "/";

		/**
		 * 构造一个符合 @plugin-cra-proxy/core 期望的 HookConfig 对象
		 * 核心只关心 dev.client.path（用于排除 HMR 的 ws 请求不走代理）
		 */
		const config: HookConfig = {
			dev: {
				client: {
					path: hmr,
				},
			},
		};

		/**
		 * 调用核心实现，传入必要的 API
		 * 核心会在内部读取 package.json.proxy，创建 http-proxy-middleware，
		 * 并通过 modifyConfig 把 setupMiddlewares 写到 config.dev 中
		 */
		craProxyCore(options).setup({
			logger: {
				start: server.config.logger.info,   // 成功信息走 vite 的 info
				error: server.config.logger.error, // 错误信息走 vite 的 error
			},
			// 让核心能读取到我们构造的 config（主要是 HMR path）
			getNormalizedConfig: () => config,
			// 核心通过这个函数往 config.dev 里写入 setupMiddlewares
			modifyConfig: (fn) => fn(config),
		});

		/**
		 * 下面是关键：把核心生成的 proxy middleware 手动插入到 Vite 的中间件栈中
		 */
		const middlewares: RequestHandler[] = [];

		// 触发核心写入的 setupMiddlewares，让它把 proxy middleware 塞到 middlewares 数组里
		// 这里的第二个参数传 {} 是因为核心实现里只用了 middlewares 参数，devServer 没用到
		const setupMiddlewares = config.dev!.setupMiddlewares;
		if (typeof setupMiddlewares === "function") {
			setupMiddlewares(middlewares, {});
		}

		/**
		 * 等 Vite 的 httpServer 真正监听端口后，再插入中间件
		 * 这样可以保证所有内置中间件都已经注册完毕
		 */
		server.httpServer?.once("listening", () => {
			// 找到 Vite 内置的 404 中间件（vite404Middleware）的位置
			// 我们要把 proxy 中间件插到它前面 → 让所有未匹配的请求走代理（和 CRA 行为一致）
			const index = server.middlewares.stack.findIndex((item) => {
				const name = typeof item.handle === "function" ? item.handle?.name : "";
				return name === "vite404Middleware";
			});

			// 如果没找到（极少见），index 会是 -1，splice 也会正常插入到最后
			middlewares.forEach((mw) => {
				// 插入到 404 中间件之前
				server.middlewares.stack.splice(index, 0, {
					route: "",
					handle: mw,
				});

				// 重要！手动把 WebSocket upgrade 事件也挂上
				// http-proxy-middleware 的 ws 支持依赖 upgrade 事件
				if (mw.upgrade) {
					server.httpServer?.on("upgrade", mw.upgrade);
				}
			});
		});
	},
});

export default pluginCraProxy;