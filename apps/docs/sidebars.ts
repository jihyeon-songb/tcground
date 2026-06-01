import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '시작하기',
      items: ['index', 'installation', 'theming'],
    },
    {
      type: 'category',
      label: '접근성',
      items: [
        'accessibility/index',
        'accessibility/dialog',
        'accessibility/tabs',
        'accessibility/radio-group',
      ],
    },
    {
      type: 'category',
      label: '컴포넌트',
      items: [
        'components/button',
        'components/input',
        'components/textarea',
        'components/label',
        'components/checkbox',
        'components/radio-group',
        'components/select',
        'components/input-group',
        'components/alert',
        'components/badge',
        'components/card',
        'components/avatar',
        'components/separator',
        'components/skeleton',
        'components/table',
        'components/alert-dialog',
        'components/popover',
        'components/sheet',
        'components/tooltip',
        'components/command',
        'components/dialog',
        'components/dropdown-menu',
        'components/tabs',
        'components/switch',
      ],
    },
  ],
};

export default sidebars;
