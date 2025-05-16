/**
 * @see https://www.electron.build/configuration/configuration
 */
export const appId = 'com.io.app'
export const productName = 'io'
export const copyright = 'Copyright © 2022 ${author}'
export const asar = true
export const directories = {
  output: 'release/${version}',
  buildResources: 'resources'
}
export const files = ['dist']
export const win = {
  target: [
    {
      target: 'nsis',
      arch: ['x64']
    }
  ],
  artifactName: '${productName}-${version}-Setup.${ext}'
}
export const nsis = {
  oneClick: false,
  perMachine: false,
  allowToChangeInstallationDirectory: true,
  deleteAppDataOnUninstall: false
}
export const mac = {
  target: ['dmg'],
  artifactName: '${productName}-${version}-Installer.${ext}'
}
export const linux = {
  target: ['AppImage'],
  artifactName: '${productName}-${version}-Installer.${ext}'
}
