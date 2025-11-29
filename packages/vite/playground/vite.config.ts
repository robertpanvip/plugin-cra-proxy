import { defineConfig } from 'vite';
import { pluginCraProxy } from '../src';

export default defineConfig({
  plugins: [pluginCraProxy()],
});
