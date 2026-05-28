import type { Preview } from '@storybook/nextjs-vite';
import * as React from 'react';
import { TooltipProvider } from '@tcground/ui';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'tcg-surface',
      values: [
        { name: 'tcg-surface', value: '#fff8f7' },
        { name: 'white', value: '#ffffff' },
        { name: 'neutral', value: '#f4f4f5' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className='tcg-storybook-frame min-h-[120px] p-6 font-sans'>
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default preview;
