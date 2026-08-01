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

  if (data.em) {
    const normalized = normalizeEmail(data.em)
    result.em = await sha256(normalized)
  }

  if (data.ph) {
    const normalized = normalizePhone(data.ph)
    result.ph = await sha256(normalized)
  }

  if (data.fn) {
    const normalized = normalizeName(data.fn)
    result.fn = await sha256(normalized)
  }

  if (data.ln) {
    const normalized = normalizeName(data.ln)
    result.ln = await sha256(normalized)
  }

  if (data.ct) {
    const normalized = normalizeCity(data.ct)
    result.ct = await sha256(normalized)
  }

  if (data.st) {
    const normalized = normalizeState(data.st)
    result.st = await sha256(normalized)
  }

  if (data.zp) {
    const normalized = normalizeZip(data.zp)
    result.zp = await sha256(normalized)
  }

  if (data.country) {
    const normalized = normalizeCountry(data.country)
    result.country = await sha256(normalized)
  }

  if (data.external_id) {
    // No normalization for external_id
    result.external_id = await sha256(data.external_id)
  }

  return result
}
