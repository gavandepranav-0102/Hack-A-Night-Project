// Shrinks an image file to a small JPEG data URL so the Project Auditor dashboard can preview it from localStorage.
export function fileToImage(file: File, max = 900, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(''); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('') }
    img.src = url
  })
}
