import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export async function generatePattern(measurements, seamAllowance, nestingOptions) {
  const response = await api.post('/pattern/generate', {
    measurements,
    seam_allowance: seamAllowance,
    num_pieces: nestingOptions.numPieces,
    spacing: nestingOptions.spacing,
    auto_flip: nestingOptions.autoFlip,
  })
  return response.data
}

export async function exportPattern(format, pieces, options = {}) {
  const payload = {
    pieces,
    page_size: options.pageSize ?? 'A4',
    include_seam_allowance: options.includeSeamAllowance ?? true,
    include_grainline: options.includeGrainline ?? true,
    include_labels: options.includeLabels ?? true,
  }
  let url = `/export/${format}`
  if (format === 'pdf' && options.pageSize) {
    url += `?page_size=${options.pageSize}`
  }
  const response = await api.post(url, payload, { responseType: 'blob' })
  return response.data
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
