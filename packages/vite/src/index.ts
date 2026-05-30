import { createMiddleware } from "@plugin-cra-proxy/core";
import type { RequestHandler } from "http-proxy-middleware";
import type { Connect, Plugin } from "vite";

const timestampRE = /\bt=\d{13}&?\b/;

const trailingSeparatorRE = /[?&]$/;

function removeTimestampQuery(url: string) {
	return url.replace(timestampRE, "").replace(trailingSeparatorRE, "");
}

const postfixRE = /[?#].*$/;

const importQueryRE = /(\?|&)import=?(?:&|$)/;

function cleanUrl(url$3: string) {
	return url$3.replace(postfixRE, "");
}

function removeImportQuery(url$3: string) {
	return url$3.replace(importQueryRE, "$1").replace(trailingSeparatorRE, "");
}
function withTrailingSlash(path$13: string) {
	if (path$13[path$13.length - 1] !== "/") return `${path$13}/`;
	return path$13;
}

const VALID_ID_PREFIX = `/@id/`;

const NULL_BYTE_PLACEHOLDER = `__x00__`;

function unwrapId(id: string) {
	return id.startsWith(VALID_ID_PREFIX)
		? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, "\0")
		: id;
}

const cache = new Map<string, boolean>();

/**
 * Vite 插件：完美复刻 Create React App 的 package.json "proxy" 功能
 * 使用方式和 CRA 完全一致，只需要在 package.json 中写一行：
 *   "proxy": "http://localhost:5000"
 * 无需任何 vite.config.ts 配置
 */
export const pluginCraProxy = (): Plugin => ({
	name: "plugin-cra-proxy",

	// 放在最后执行，确保其他插件（如 rsbuild/vite 自己的配置）已经完成
	enforce: "post",

	// 只在开发服务器时生效
	apply: "serve",

	/**
	 * Vite 开发服务器启动后执行的钩子
	 */
	configureServer(server) {
		// 获取 Vite HMR 的 WebSocket 路径（默认可能是 /@vite/client、/__vite_hmr 等）
		const hmr =
			typeof server.config.server.hmr === "object"
				? (server.config.server.hmr?.path ?? "/")
				: "/";
		const base = server.config.base || "/";
		const mw = createMiddleware({
			hmr,
			logger: {
				start: server.config.logger.info, // 成功信息走 vite 的 info
				error: server.config.logger.error, // 错误信息走 vite 的 error
			},
		}) as RequestHandler | undefined;
		if (!mw) {
			return () => {};
		}

		const options = server.config;
		const type = options?.ssr ? "ssr" : "client";
		const environment = server.environments[type];

		const resolveId = async (rawId: string) => {
			if (cache.has(rawId)) {
				return cache.get(rawId) as boolean;
			}
			const resolved = await environment.pluginContainer.resolveId(
				rawId,
				void 0,
			);
			cache.set(rawId, !!resolved);
			return !!resolved;
		};

		const wrapped: Connect.NextHandleFunction = async (req, res, next) => {
			let url = req.url || "/";
			url = decodeURI(removeTimestampQuery(url)).replace(
				NULL_BYTE_PLACEHOLDER,
				"\0",
			);
			url = cleanUrl(url);

			url = removeImportQuery(url);

			const unwrapUrl = unwrapId(url);

			const isViteSource = `${req.url}/`.startsWith(base);

			const finalUrl = isViteSource
				? unwrapUrl.slice(base.length - 1)
				: unwrapUrl;

			const resolved = await resolveId(finalUrl);

			const slashUrl = withTrailingSlash(unwrapUrl);

			if (resolved || slashUrl === base) {
				next();
			} else {
				await mw(req, res, (err) => {
					next?.(err);
				});
			}
		};
		server.middlewares.use(wrapped);
		if (mw.upgrade) {
			server.httpServer?.on("upgrade", mw.upgrade);
		}
		return () => {};
	},
});

export default pluginCraProxy;
