import { pluginCraProxy } from "@plugin-cra-proxy/core";
const src_pluginCraProxy = (options)=>({
        name: 'plugin-cra-proxy',
        setup (api) {
            pluginCraProxy(options).setup({
                ...api,
                modifyConfig: api.modifyRsbuildConfig
            });
        }
    });
const src = src_pluginCraProxy;
export { src as default, src_pluginCraProxy as pluginCraProxy };
