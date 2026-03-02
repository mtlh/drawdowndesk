import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'DrawdownDesk',
    ignore: [
      /^\/src$/,
      /^\/src\//,
      /^\/convex$/,
      /^\/convex\//,
      /^\/\./,
      /\.ts$/,
      /\.tsx$/,
    ],
  },
  makers: [
    new MakerZIP({}, ['win32']),
  ],
};

export default config;
