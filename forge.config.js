const { MakerZIP } = require('@electron-forge/maker-zip');

module.exports = {
  packagerConfig: {
    name: 'DrawdownDesk',
    icon: './src/app/favicon',
    asar: true,
  },
  makers: [
    new MakerZIP({}, ['win32']),
  ],
};
