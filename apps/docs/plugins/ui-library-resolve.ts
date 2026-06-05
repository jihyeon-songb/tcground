import type { Plugin } from '@docusaurus/types';
import path from 'node:path';

export default function uiLibraryResolvePlugin(): Plugin {
  return {
    name: 'ui-library-resolve',
    configureWebpack() {
      return {
        resolve: {
          alias: {
            '@tcground/ui': path.resolve(__dirname, '../../../packages/ui/dist/index.js'),
            '@tcground/headless': path.resolve(
              __dirname,
              '../../../packages/headless/dist/index.js',
            ),
          },
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              include: /packages\/(headless|ui)\/dist/,
              resolve: { fullySpecified: false },
            },
          ],
        },
      };
    },
  };
}
