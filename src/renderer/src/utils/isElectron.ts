export function isElectron(): boolean {
  const isElectronProcess = window.electron && window.electron.ipcRenderer
  return !!isElectronProcess
}
