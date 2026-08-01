export async function sha256(str: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto API not available')
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  return phone.replace(/\D/g, '')
}

export function normalizeName(name: string): string {
  // Lowercase, trim, remove non-letter characters
  return name.toLowerCase().trim().replace(/[^a-z]/g, '')
}

export function normalizeCity(city: string): string {
  // Lowercase, remove spaces
  return city.toLowerCase().replace(/\s/g, '')
}

export function normalizeState(state: string): string {
  // Lowercase 2-letter code
  return state.toLowerCase().trim().slice(0, 2)
}

export function normalizeZip(zip: string): string {
  // First 5 digits only
  return zip.replace(/\D/g, '').slice(0, 5)
}

export function normalizeCountry(country: string): string {
  // Lowercase 2-letter code
  return country.toLowerCase().trim().slice(0, 2)
}

export async function hashValue(value: string): Promise<string> {
  return sha256(value)
}

export interface HashedAdvancedMatchingData {
  em?: string
  ph?: string
  fn?: string
  ln?: string
  ct?: string
  st?: string
  zp?: string
  country?: string
  external_id?: string
}

export async function normalizeAndHash(data: {
  em?: string
  ph?: string
  fn?: string
  ln?: string
  ct?: string
  st?: string
  zp?: string
  country?: string
  external_id?: string
}): Promise<HashedAdvancedMatchingData> {
  const result: HashedAdvancedMatchingData = {}
  const promises: Promise<void>[] = []

  if (data.em) {
    promises.push(sha256(normalizeEmail(data.em)).then(h => { result.em = h }))
  }
  if (data.ph) {
    promises.push(sha256(normalizePhone(data.ph)).then(h => { result.ph = h }))
  }
  if (data.fn) {
    promises.push(sha256(normalizeName(data.fn)).then(h => { result.fn = h }))
  }
  if (data.ln) {
    promises.push(sha256(normalizeName(data.ln)).then(h => { result.ln = h }))
  }
  if (data.ct) {
    promises.push(sha256(normalizeCity(data.ct)).then(h => { result.ct = h }))
  }
  if (data.st) {
    promises.push(sha256(normalizeState(data.st)).then(h => { result.st = h }))
  }
  if (data.zp) {
    promises.push(sha256(normalizeZip(data.zp)).then(h => { result.zp = h }))
  }
  if (data.country) {
    promises.push(sha256(normalizeCountry(data.country)).then(h => { result.country = h }))
  }
  if (data.external_id) {
    promises.push(sha256(data.external_id).then(h => { result.external_id = h }))
  }

  await Promise.all(promises)
  return result
}
