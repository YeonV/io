// --- Helper: Renderer-side ArrayBuffer to Base64 for Export ---
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// --- Helper: Base64 to ArrayBuffer for Import ---
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

// --- Download Helper ---
export const downloadJsonFile = (content: any, fileName: string) => {
  const a = document.createElement('a')
  const file = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
  a.href = URL.createObjectURL(file)
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
