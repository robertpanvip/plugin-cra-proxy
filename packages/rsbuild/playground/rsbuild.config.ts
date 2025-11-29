import { defineConfig } from '@rsbuild/core';
import { pluginCraProxy } from '../src';

export default defineConfig({
  plugins: [pluginCraProxy()],
});
