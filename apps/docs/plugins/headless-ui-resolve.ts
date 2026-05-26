import type {LoadContext, Plugin} from '@docusaurus/types';

export default function headlessUiResolvePlugin(_context: LoadContext): Plugin {
  return {
    name: 'headless-ui-resolve',
    configureWebpack() {
      return {
        module: {
          rules: [
            {
              test: /\.js$/,
              include: /packages\/ui\/dist/,
              resolve: {fullySpecified: false},
            },
          ],
        },
      };
    },
  };
}
