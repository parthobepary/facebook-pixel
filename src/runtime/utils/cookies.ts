export interface CookieOptions {
  maxAge?: number
  path?: string
  domain?: string
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }

  return null
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return

  const {
    maxAge,
    path = '/',
    domain,
    secure = true,
    sameSite = 'lax'
  } = options

  let cookieString = `${name}=${value}; path=${path}; SameSite=${sameSite}`

  if (maxAge !== undefined) {
    cookieString += `; max-age=${maxAge}`
  }

  if (domain) {
    cookieString += `; domain=${domain}`
  }

  if (secure) {
    cookieString += '; Secure'
  }

  document.cookie = cookieString
}

export function deleteCookie(name: string, path: string = '/'): void {
  if (typeof document === 'undefined') return

  document.cookie = `${name}=; path=${path}; max-age=0`
}

export function generateFbp(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000000000)
  return `fb.1.${timestamp}.${random}`
}
