import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const account = env.FILEMAKER_ACCOUNT;
  const password = env.FILEMAKER_PASSWORD;
  const basicAuth = account && password
    ? `Basic ${Buffer.from(`${account}:${password}`, 'utf8').toString('base64')}`
    : '';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/fm-api': {
          target: env.FILEMAKER_BASE_URL || 'https://fms.aralogistic.com',
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/fm-api/, ''),
          configure(proxy) {
            proxy.on('proxyReq', (proxyRequest, request) => {
              if (request.method === 'POST' && proxyRequest.path.endsWith('/sessions') && basicAuth) {
                proxyRequest.setHeader('Authorization', basicAuth);
              }
            });
          },
        },
      },
    },
  };
});
