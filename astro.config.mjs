import { satteri } from '@astrojs/markdown-satteri';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { stripBuildOrder } from './src/guides/strip-build-order.ts';

// Latin files of the installed @fontsource packages, served by the site: no font request leaves the domain.
// The npm provider is not used: its file:// URLs fail in Astro 7.4 metrics fetching (CannotFetchFontFile).
const fontsourceFile = (family, weight) => ({
  src: [`@fontsource/${family}/files/${family}-latin-${weight}-normal.woff2`],
  weight,
  style: 'normal',
});

// Pages that only redirect (/ and /wiki/<faction>), and the 404: kept out of the sitemap.
const NOT_IN_SITEMAP = /^\/(wiki\/[^/]+\/?|404\/?)?$/;

// Same URLs as the canonical links: the internal links have no trailing slash.
const withoutTrailingSlash = (item) => ({ ...item, url: item.url.replace(/\/$/, '') });

export default defineConfig({
  site: 'https://www.zerospace.fr',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !NOT_IN_SITEMAP.test(new URL(page).pathname),
      serialize: withoutTrailingSlash,
    }),
  ],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Oxanium',
      cssVariable: '--font-oxanium',
      fallbacks: ['sans-serif'],
      options: { variants: [400, 600, 700].map((weight) => fontsourceFile('oxanium', weight)) },
    },
    {
      provider: fontProviders.local(),
      name: 'Chakra Petch',
      cssVariable: '--font-chakra-petch',
      fallbacks: ['sans-serif'],
      options: { variants: [fontsourceFile('chakra-petch', 600)] },
    },
  ],
  markdown: {
    processor: satteri({ mdastPlugins: [stripBuildOrder] }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
