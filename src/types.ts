export interface MetaPixelOptions {
  disabled?: boolean
  debug?: boolean
  consentMode?: boolean
  autoPageView?: boolean
  testEventCode?: string
  deferLoad?: boolean
  immediateLoadPaths?: string[]
}

export interface MetaPixelParams {
  content_ids?: string[]
  content_name?: string
  content_type?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
  search_string?: string
  status?: string
  order_id?: string
  [key: string]: unknown
}

export interface AdvancedMatchingData {
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

export interface ValidatedCookies {
  fbc: string | null
  fbp: string | null
  isValid: boolean
}

export interface QueuedEvent {
  name: string
  params: MetaPixelParams
  eventId?: string
  timestamp: number
}

export interface ServerPayload {
  event_name: string
  event_id?: string
  event_time: number
  event_source_url: string
  user_data: {
    fbc?: string | null
    fbp?: string | null
    client_user_agent: string
  }
  custom_data: MetaPixelParams
}

declare global {
  interface Window {
    fbq: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void
      queue?: unknown[]
      loaded?: boolean
      version?: string
      push?: (...args: unknown[]) => void
    }
    _fbq: typeof Window.prototype.fbq
  }
}

export interface UseMetaPixel {
  trackPageView: (params?: MetaPixelParams, eventId?: string) => void
  trackViewContent: (params: MetaPixelParams, eventId?: string) => void
  trackSearch: (params: MetaPixelParams, eventId?: string) => void
  trackAddToWishlist: (params: MetaPixelParams, eventId?: string) => void
  trackAddToCart: (params: MetaPixelParams, eventId?: string) => void
  trackInitiateCheckout: (params: MetaPixelParams, eventId?: string) => void
  trackAddPaymentInfo: (params: MetaPixelParams, eventId?: string) => void
  trackPurchase: (params: MetaPixelParams, eventId?: string) => void
  trackSubscribe: (params: MetaPixelParams, eventId?: string) => void
  trackStartTrial: (params: MetaPixelParams, eventId?: string) => void
  trackLead: (params?: MetaPixelParams, eventId?: string) => void
  trackCompleteRegistration: (params?: MetaPixelParams, eventId?: string) => void
  trackContact: (params?: MetaPixelParams, eventId?: string) => void
  trackSubmitApplication: (params?: MetaPixelParams, eventId?: string) => void
  trackCustom: (eventName: string, params: MetaPixelParams, eventId?: string) => void
  setAdvancedMatching: (data: AdvancedMatchingData) => Promise<void>
  setAdvancedMatchingHashed: (data: AdvancedMatchingData) => void
  getValidatedCookies: () => ValidatedCookies
  hashValue: (value: string) => Promise<string>
  normalizeEmail: (email: string) => string
  normalizePhone: (phone: string) => string
  normalizeName: (name: string) => string
  prepareServerPayload: (eventName: string, params: MetaPixelParams, eventId?: string) => ServerPayload
  grantConsent: () => void
  revokeConsent: () => void
  isReady: { value: boolean }
  onReady: (callback: () => void) => void
}
