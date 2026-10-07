import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const account = env.FILEMAKER_ACCOUNT;
  const password = env.FILEMAKER_PASSWORD;
  const basicAuth =
    account && password
      ? `Basic ${Buffer.from(`${account}:${password}`, 'utf8').toString('base64')}`
      : '';

  return {
    base: mode === 'production' ? '/ARADashboard/' : '/',
    plugins: [react()],
    server: {
      proxy: {
        '/fm-api': {
          target: env.FILEMAKER_BASE_URL || 'https://fms.aralogistic.com',
          changeOrigin: true,
          secure: true,
          cookieDomainRewrite: '',
          rewrite: (path) => path.replace(/^\/fm-api/, ''),
          configure(proxy) {
            proxy.on('proxyReq', (proxyRequest, request) => {
              if (
                request.method === 'POST' &&
                proxyRequest.path.endsWith('/sessions') &&
                basicAuth
              ) {
                proxyRequest.setHeader('Authorization', basicAuth);
              }
            });
            proxy.on('proxyRes', (proxyResponse, request) => {
              const location = proxyResponse.headers.location;
              if (!location) return;

              try {
                const target = new URL(env.FILEMAKER_BASE_URL || 'https://fms.aralogistic.com');
                const upstreamPath = request.url.replace(/^\/fm-api/, '');
                const requestUrl = new URL(upstreamPath, target);
                const redirectedUrl = new URL(location, requestUrl);
                if (/^\/Streaming(?:_SSL)?\//i.test(redirectedUrl.pathname)) {
                  proxyResponse.headers.location = `/fm-api${redirectedUrl.pathname}${redirectedUrl.search}${redirectedUrl.hash}`;
                }
              } catch {
                // Leave non-URL redirect values untouched.
              }
            });
          },
        },
      },
    },
  };
});
