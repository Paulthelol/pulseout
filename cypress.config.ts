import { defineConfig } from "cypress";

export default defineConfig({
  projectId: 'ge415s',
  component: {
    devServer: {
      framework: "next",    // Using Next.js as the framework
      bundler: "webpack",   // Using Webpack as the bundler
      webpackConfig: {
        resolve: {
          fallback: Object.assign(
            {},
            ...[
              'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 
              'dns', 'domain', 'fs', 'http', 'https', 'os', 'path', 'perf_hooks', 
              'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 
              'tls', 'tty', 'url', 'util', 'vm', 'zlib','net'
            ].map(module => ({
              [module]: false,
            }))
          ),
        },
      },
    },
  },
});
