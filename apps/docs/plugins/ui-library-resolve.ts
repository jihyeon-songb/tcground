import type { Plugin } from '@docusaurus/types';
import path from 'node:path';

export default function uiLibraryResolvePlugin(): Plugin {
  return {
    name: 'ui-library-resolve',
    configureWebpack() {
      return {
        resolve: {
          alias: {
            '@tcground/ui': path.resolve(__dirname, '../../../packages/ui/src'),
            '@tcground/headless': path.resolve(__dirname, '../../../packages/headless/src'),
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              include: /packages\/ui\/dist/,
              resolve: { fullySpecified: false },
            },
          ],
        },
      };
    },
  };
}
