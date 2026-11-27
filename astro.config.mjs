import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ccaf.or.kr',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
