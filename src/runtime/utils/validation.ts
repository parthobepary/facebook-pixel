import { getCookie, setCookie, deleteCookie, generateFbp } from './cookies'
import type { ValidatedCookies } from '../../types'

const FBC_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const FBP_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000 // 90 days
const FBP_MAX_AGE_SECONDS = 90 * 24 * 60 * 60 // 90 days in seconds

export function validateFbc(fbc: string | null, debug: boolean = false): string | null {
  if (!fbc) return null

  // Format: fb.1.{timestamp}.{fbclid}
  const parts = fbc.split('.')

  if (parts.length < 4) {
    if (debug) console.warn('[MetaPixel] Invalid _fbc format')
    return null
  }

  const timestamp = parseInt(parts[2], 10)

  if (isNaN(timestamp)) {
    if (debug) console.warn('[MetaPixel] Invalid _fbc timestamp')
    return null
  }

  const age = Date.now() - timestamp

  if (age > FBC_MAX_AGE_MS) {
    deleteCookie('_fbc')
    if (debug) console.warn('[MetaPixel] Expired _fbc removed')
    return null
  }

  return fbc
}

export function validateFbp(fbp: string | null, debug: boolean = false): string | null {
  if (!fbp) {
    // Generate fresh _fbp if missing
    const newFbp = generateFbp()
    setCookie('_fbp', newFbp, { maxAge: FBP_MAX_AGE_SECONDS, sameSite: 'lax', secure: true })
    if (debug) console.log('[MetaPixel] Generated new _fbp')
    return newFbp
  }

  // Format: fb.1.{timestamp}.{random}
  const parts = fbp.split('.')

  if (parts.length < 4) {
    if (debug) console.warn('[MetaPixel] Invalid _fbp format')
    const newFbp = generateFbp()
    setCookie('_fbp', newFbp, { maxAge: FBP_MAX_AGE_SECONDS, sameSite: 'lax', secure: true })
    return newFbp
  }

  const timestamp = parseInt(parts[2], 10)

  if (isNaN(timestamp)) {
    if (debug) console.warn('[MetaPixel] Invalid _fbp timestamp')
    const newFbp = generateFbp()
    setCookie('_fbp', newFbp, { maxAge: FBP_MAX_AGE_SECONDS, sameSite: 'lax', secure: true })
    return newFbp
  }

  const age = Date.now() - timestamp

  if (age > FBP_MAX_AGE_MS) {
    // Regenerate fresh _fbp
    const newFbp = generateFbp()
    setCookie('_fbp', newFbp, { maxAge: FBP_MAX_AGE_SECONDS, sameSite: 'lax', secure: true })
    if (debug) console.warn('[MetaPixel] Expired _fbp regenerated')
    return newFbp
  }

  return fbp
}

export function getValidatedCookies(debug: boolean = false): ValidatedCookies {
  const rawFbc = getCookie('_fbc')
  const rawFbp = getCookie('_fbp')

  const fbc = validateFbc(rawFbc, debug)
  const fbp = validateFbp(rawFbp, debug)

  return {
    fbc,
    fbp,
    isValid: fbc !== null || fbp !== null
  }
}

export function captureFbclid(debug: boolean = false): void {
  if (typeof window === 'undefined') return

  try {
    const url = new URL(window.location.href)
    const fbclid = url.searchParams.get('fbclid')

    if (fbclid) {
      const fbc = `fb.1.${Date.now()}.${fbclid}`
      setCookie('_fbc', fbc, {
        maxAge: 7 * 24 * 60 * 60,
        sameSite: 'lax',
        secure: true
      })
      if (debug) console.log('[MetaPixel] Captured fbclid:', fbclid)
    }
  } catch {
    if (debug) console.warn('[MetaPixel] Failed to parse URL for fbclid')
  }
}
