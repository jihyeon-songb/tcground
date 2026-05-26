import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Pokemon Headless UI',
  tagline: 'Accessibility-first React primitives with Pokemon theme tokens',
  url: 'https://example.com',
  baseUrl: '/',
  organizationName: 'tcground',
  projectName: 'pokemon-headless-ui',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },
  plugins: ['./plugins/headless-ui-resolve.ts'],
  presets: [
    [
      'classic',
      {
        blog: false,
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Pokemon Headless UI',
      items: [
        { to: '/', label: '소개', position: 'left' },
        { to: '/components/button', label: '컴포넌트', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: '설치', to: '/installation' },
            { label: '테마', to: '/theming' },
            { label: '접근성', to: '/accessibility' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Pokemon Headless UI.`,
    },
    prism: {
      additionalLanguages: ['tsx', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
