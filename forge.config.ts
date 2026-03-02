import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'DrawdownDesk',
    executableName: 'DrawdownDesk',
    asar: true,
    ignore: [
      /^\/public/,
      /^\/release/,
      /^\/src/,
      /^\/convex/,
      /^\/node_modules\/(?!electron-store)/,
      /\.ts$/,
      /\.tsx$/,
      /\.git/,
      /\.next/,
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['win32', 'darwin', 'linux']),
  ],
};

export default config;
