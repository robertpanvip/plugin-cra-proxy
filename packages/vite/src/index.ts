import { createMiddleware } from "@plugin-cra-proxy/core";
import type { RequestHandler } from "http-proxy-middleware";
import { type Connect, type Plugin } from "vite";

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
  if ("/" !== path$13[path$13.length - 1]) return `${path$13}/`;
  return path$13;
}
const VALID_ID_PREFIX = "/@id/";
const NULL_BYTE_PLACEHOLDER = "__x00__";
function unwrapId(id: string) {
  return id.startsWith(VALID_ID_PREFIX)
    ? id.slice(VALID_ID_PREFIX.length).replace(NULL_BYTE_PLACEHOLDER, "\0")
    : id;
}

// ============== Vite 内部资源 URL 模式（同步快速判断，零 I/O）==============
const VITE_INTERNAL_RE = /^\/(@id|@fs|@vite|node_modules\/\.vite)\//;
const JS_REQUEST_RE = /\.(?:[cm]?[jt]sx?|json|vue|svelte|astro)(?:\?|$)/i;
const CSS_REQUEST_RE = /\.css(?:\?|$)/i;
const STATIC_ASSET_RE =
  /\.(?:png|jpe?g|webp|gif|avif|svg|ico|woff2?|eot|ttf|otf|mp[34]|webm|ogg|wav|flac|aac)(?:\?|$)/i;
const IMPORT_QUERY_RE$1 = /[?&]import\b/;
/**
 * 判断是否为 Vite 管辖的资源
 * 最强信号：浏览器 sec-fetch-dest 请求头（比 URL 正则更准）
 * 补充信号：URL 模式 / import query
 */
const isViteAsset = (req: Connect.IncomingMessage, url: string) => {
  // 最强信号：浏览器声明这是脚本请求（<script> / import / import()）
  if (req.headers["sec-fetch-dest"] === "script") return true;

  // 补充信号：URL 模式 + import query
  return (
    VITE_INTERNAL_RE.test(url) ||
    JS_REQUEST_RE.test(url) ||
    CSS_REQUEST_RE.test(url) ||
    STATIC_ASSET_RE.test(url) ||
    IMPORT_QUERY_RE$1.test(url)
  );
};
const cache = new Map();

export type PluginCraProxyOptions = {
  /**
   * 代理目标地址。优先级高于 package.json 中的 "proxy" 字段。
   */
  proxy?: string;
};

/**
 * Vite 插件：完美复刻 Create React App 的 package.json "proxy" 功能
 * 使用方式和 CRA 完全一致，只需要在 package.json 中写一行：
 *   "proxy": "http://localhost:5000"
 * 也可以通过插件参数传入 proxy，优先级高于 package.json。
 */
export const pluginCraProxy = (config: PluginCraProxyOptions = {}): Plugin => ({
  name: "plugin-cra-proxy",
  enforce: "post", // 放在最后执行，确保其他插件（如 rsbuild/vite 自己的配置）已经完成
  apply: "serve", // // 只在开发服务器时生效
  configureServer(server) {
    let hmr = "/";
    if ("object" === typeof server.config.server.ws) {
      hmr = server.config.server.ws?.path ?? "/";
    } else if ("object" === typeof server.config.server.hmr) {
      hmr = server.config.server.hmr?.path ?? "/";
    }

    const base = server.config.base || "/";

    const mw = createMiddleware({
      proxy: config.proxy,
      hmr,
      logger: {
        start: server.config.logger.info,
        error: server.config.logger.error,
      },
    }) as RequestHandler | undefined;
    if (!mw) return () => {};
    const options = server.config;
    const type = options?.ssr ? "ssr" : "client";
    const environment = server.environments[type];
    const resolveId = async (rawId: string) => {
      if (cache.has(rawId)) return cache.get(rawId);
      const resolved = await environment.pluginContainer.resolveId(rawId, void 0);
      cache.set(rawId, !!resolved);
      return !!resolved;
    };

    const wrapped: Connect.NextHandleFunction = async (req, res, next) => {
      const rawUrl = req.url || "/";

      // 第一层：base 根路径直接交给 Vite
      if (withTrailingSlash(cleanUrl(rawUrl)) === base) return next();

      // 第一层：非 base 下肯定不是 Vite 模块，直接交给 cra-proxy（跳过所有判断）
      const isViteSource = `${rawUrl}/`.startsWith(base);
      if (!isViteSource) {
        return mw(req, res, (err) => next?.(err));
      }

      // 归一化 URL：还原 \0 占位符、去 timestamp、去 query/hash、去 ?import
      let url = decodeURI(removeTimestampQuery(rawUrl)).replace(NULL_BYTE_PLACEHOLDER, "\0");
      url = cleanUrl(url);
      url = removeImportQuery(url);
      // 剥 base，让 /@id/ 前缀回到开头
      url = url.slice(base.length - 1);

      // 第二层：请求头 + URL 模式白名单（同步、零 I/O，覆盖 95%+ Vite 资源）
      if (isViteAsset(req, url)) return next();

      // 第三层：moduleGraph 缓存命中（Vite 已 transform 过的模块，O(1) 查找）
      const mod = await environment.moduleGraph.getModuleByUrl(url);
      if (mod) return next();

      // 兜底：resolveId（仅首屏冷启动的边缘模块会落到这里）
      const id = unwrapId(url);
      const resolved = await resolveId(id);
      if (resolved) next();
      else
        await mw(req, res, (err) => {
          next?.(err);
        });
    };
    server.middlewares.use(wrapped);
    if (mw.upgrade) server.httpServer?.on("upgrade", mw.upgrade);
    return () => {};
  },
});
export default pluginCraProxy;
