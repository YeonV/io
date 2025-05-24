import { useState } from 'react'

function Versions(): React.ReactNode {
  const [versions] = useState(window.electron.process.versions)

  return (
    <div className="versions">
      <p className="electron-version">Electron v{versions.electron}</p>
      <p className="chrome-version">Chromium v{versions.chrome}</p>
      <p className="node-version">Node v{versions.node}</p>
    </div>
  )
}

export default Versions
