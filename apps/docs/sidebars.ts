import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '시작하기',
      items: ['index', 'installation', 'theming', 'accessibility'],
    },
    {
      type: 'category',
      label: '컴포넌트',
      items: [
        'components/button',
        'components/dialog',
        'components/dropdown-menu',
        'components/tabs',
        'components/toggle',
      ],
    },
  ],
};

export default sidebars;
