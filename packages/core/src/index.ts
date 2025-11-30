import fs from 'node:fs';
import type {IncomingMessage} from "node:http";
import {Socket} from 'node:net';
import path from 'node:path';
import url from 'node:url';
import * as address from 'address';
import {createProxyMiddleware} from 'http-proxy-middleware';

// biome-ignore lint/complexity/noBannedTypes: {}
export type PluginCraProxyOptions = {};

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (p: string) => path.resolve(appDirectory, p);

function fixWinLoopback(proxy: string): string {
    const o = url.parse(proxy);
    // @ts-expect-error
    o.host = undefined;
    if (o.hostname !== 'localhost') {
        return proxy;
    }
    try {
        if (!address.ip()) {
            o.hostname = '127.0.0.1';
        }
    } catch (_ignored) {
        o.hostname = '127.0.0.1';
    }
    return url.format(o);
}

export type SetupMiddlewaresFn = (middlewares: {
    unshift: (...handlers: any[]) => void;
    push: (...handlers: any[]) => void;
}, server: any) => void;

export type HookConfig = {
    dev?: {
        client?: {
            path?: string
        }
        setupMiddlewares?: SetupMiddlewaresFn | SetupMiddlewaresFn[];
    }
}
type Api = {
    getNormalizedConfig(): HookConfig,
    modifyConfig(fn: (config: HookConfig) => void): void;
    logger: {
        start: (message: string) => void;
        error: (message: string) => void
    }
}

type Plugin = {
    name: string;
    setup: (api: Api) => void
}

function isWebSocketRequest(req: IncomingMessage) {
    return req.headers.upgrade?.toLowerCase() === 'websocket';
}

export const pluginCraProxy = (_?: PluginCraProxyOptions): Plugin => ({
    name: 'plugin-cra-proxy',

    setup(api) {
        api.modifyConfig((config) => {
            const pkgPath = resolveApp('package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const proxy = pkg.proxy;

            if (!proxy) return;
            if (typeof proxy !== 'string') {
                api.logger.error(`"proxy" in package.json must be a string`);
                process.exit(1);
            }

            const target = fixWinLoopback(proxy);
            api.logger.start(`Proxy target: ${target}`);

            const proxyMw = createProxyMiddleware({
                target,
                changeOrigin: true,
                ws: true,
                secure: false,
                xfwd: true,
                pathFilter: (pathname, req) => {
                    const hmr = api.getNormalizedConfig().dev?.client?.path;
                    // 排除 hmr，保留其他 ws 请求
                    if (hmr && isWebSocketRequest(req) && pathname.includes(hmr)) {
                        return false;
                    }
                    //排除 Chrome DevTools 的 自动工作区文件夹功能 发出的请求
                    return !pathname.startsWith('/.well-known/appspecific/com.chrome.devtools');

                },
                on: {
                    /**
                     * 🎯 关键逻辑：
                     * 所有没有被 rsbuild 处理的请求全部代理
                     */
                    proxyReq(proxyReq) {
                        // CRA 一样的逻辑：如果有 origin，改成 target
                        const origin = proxyReq.getHeader('origin');
                        if (origin) proxyReq.setHeader('origin', target);
                    },
                    error(err, req, res) {
                        const msg = `Proxy error: Could not proxy ${req.url} to ${target} (${err.message})`;
                        api.logger.error(msg);
                        if (res instanceof Socket) {
                            res.end(msg);
                        } else {
                            res.statusCode = 503;
                            res.setHeader('content-type', 'text/plain')
                            res.end(msg, 'utf-8');
                        }
                    },
                },
            });

            // ✨ 使用 config.dev.setupMiddlewares
            config.dev ??= {};
            const userSetup = config.dev?.setupMiddlewares;

            config.dev.setupMiddlewares = (middlewares, devServer) => {
                // 调回用户原有的（如果有）
                if (typeof userSetup === 'function') {
                    userSetup(middlewares, devServer);
                } else if (Array.isArray(userSetup)) {
                    userSetup.forEach((setup) => {
                        typeof setup === 'function' && setup(middlewares, devServer);
                    });
                }

                /**
                 * 💡 插入到最后面
                 * 保证 rsbuild 默认的静态资源 / HMR / HTML 都先处理
                 * 剩下所有请求交给 proxyMw
                 */
                middlewares.push(proxyMw);
            };
        });
    },
});

export default pluginCraProxy;
