import { useRuntimeConfig } from '#imports'
import type {
  MetaPixelParams,
  AdvancedMatchingData,
  ValidatedCookies,
  QueuedEvent,
  ServerPayload
} from '../../types'
import { getValidatedCookies } from '../utils/validation'
import {
  normalizeAndHash,
  hashValue as hashUtil,
  normalizeEmail as normalizeEmailUtil,
  normalizePhone as normalizePhoneUtil,
  normalizeName as normalizeNameUtil
} from '../utils/hash'

let isPixelLoaded = false
let hasConsent = false
let storedUserData: Record<string, string> = {}
const eventQueue: QueuedEvent[] = []
const readyCallbacks: Array<() => void> = []

export function useMetaPixel() {
  const config = useRuntimeConfig()
  const options = config.public.metaPixel || {}
  const pixelId = config.public.pixelId || ''
  const debug = options.debug || false
  const consentMode = options.consentMode || false
  const testEventCode = options.testEventCode || ''

  const log = (...args: unknown[]) => {
    if (debug) {
      const prefix = testEventCode ? `[MetaPixel:TEST]` : '[MetaPixel]'
      console.log(prefix, ...args)
    }
  }

  const warn = (...args: unknown[]) => {
    if (debug) console.warn('[MetaPixel]', ...args)
  }

  const validatePayload = (eventName: string, params: MetaPixelParams): MetaPixelParams => {
    const warnings: string[] = []
    const validated = { ...params }

    if (eventName === 'Purchase') {
      if (validated.value === undefined) warnings.push('Purchase missing "value"')
      if (!validated.currency) warnings.push('Purchase missing "currency"')
      if (!validated.content_ids?.length) warnings.push('Purchase missing "content_ids"')
    }

    if (validated.content_ids) {
      validated.content_ids = validated.content_ids.map(id => String(id))
    }

    if (validated.value !== undefined && typeof validated.value !== 'number') {
      validated.value = parseFloat(String(validated.value))
    }

    if (warnings.length) {
      warn(eventName, warnings)
    }

    return validated
  }

  const trackEvent = (eventName: string, params: MetaPixelParams = {}, eventId?: string) => {
    if (options.disabled) {
      log('Tracking disabled')
      return
    }

    if (consentMode && !hasConsent) {
      log('Waiting for consent, queuing event:', eventName)
      eventQueue.push({ name: eventName, params, eventId, timestamp: Date.now() })
      return
    }

    if (!isPixelLoaded) {
      log('Pixel not loaded yet, queuing event:', eventName)
      eventQueue.push({ name: eventName, params, eventId, timestamp: Date.now() })
      return
    }

    const validatedParams = validatePayload(eventName, params)
    const eventOptions: Record<string, unknown> = {}

    if (eventId) {
      eventOptions.eventID = eventId
    }

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, validatedParams, eventOptions)
      log(eventName, { params: validatedParams, eventId })
    }
  }

  const trackCustomEvent = (eventName: string, params: MetaPixelParams = {}, eventId?: string) => {
    if (options.disabled) return

    if (consentMode && !hasConsent) {
      eventQueue.push({ name: eventName, params, eventId, timestamp: Date.now() })
      return
    }

    if (!isPixelLoaded) {
      eventQueue.push({ name: eventName, params, eventId, timestamp: Date.now() })
      return
    }

    const eventOptions: Record<string, unknown> = {}
    if (eventId) {
      eventOptions.eventID = eventId
    }

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, params, eventOptions)
      log('Custom:', eventName, { params, eventId })
    }
  }

  // Standard Events
  const trackPageView = (params?: MetaPixelParams, eventId?: string) => {
    trackEvent('PageView', params || {}, eventId)
  }

  const trackViewContent = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('ViewContent', params, eventId)
  }

  const trackSearch = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('Search', params, eventId)
  }

  const trackAddToWishlist = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('AddToWishlist', params, eventId)
  }

  const trackAddToCart = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('AddToCart', params, eventId)
  }

  const trackInitiateCheckout = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('InitiateCheckout', params, eventId)
  }

  const trackAddPaymentInfo = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('AddPaymentInfo', params, eventId)
  }

  const trackPurchase = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('Purchase', params, eventId)
  }

  const trackSubscribe = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('Subscribe', params, eventId)
  }

  const trackStartTrial = (params: MetaPixelParams, eventId?: string) => {
    trackEvent('StartTrial', params, eventId)
  }

  const trackLead = (params?: MetaPixelParams, eventId?: string) => {
    trackEvent('Lead', params || {}, eventId)
  }

  const trackCompleteRegistration = (params?: MetaPixelParams, eventId?: string) => {
    trackEvent('CompleteRegistration', params || {}, eventId)
  }

  const trackContact = (params?: MetaPixelParams, eventId?: string) => {
    trackEvent('Contact', params || {}, eventId)
  }

  const trackSubmitApplication = (params?: MetaPixelParams, eventId?: string) => {
    trackEvent('SubmitApplication', params || {}, eventId)
  }

  const trackCustom = (eventName: string, params: MetaPixelParams, eventId?: string) => {
    trackCustomEvent(eventName, params, eventId)
  }

  // Advanced Matching
  const setAdvancedMatching = async (data: AdvancedMatchingData): Promise<void> => {
    const hashed = await normalizeAndHash(data)
    storedUserData = hashed

    if (typeof window !== 'undefined' && typeof window.fbq === 'function' && pixelId) {
      window.fbq('init', pixelId, hashed)
      log('Advanced matching set:', Object.keys(hashed))
    }
  }

  const setAdvancedMatchingHashed = (data: AdvancedMatchingData): void => {
    storedUserData = data as Record<string, string>

    if (typeof window !== 'undefined' && typeof window.fbq === 'function' && pixelId) {
      window.fbq('init', pixelId, data)
      log('Advanced matching set (pre-hashed):', Object.keys(data))
    }
  }

  // Cookie Management
  const getValidatedCookiesWrapper = (): ValidatedCookies => {
    return getValidatedCookies(debug)
  }

  // Hash Utilities
  const hashValue = async (value: string): Promise<string> => {
    return hashUtil(value)
  }

  const normalizeEmail = (email: string): string => {
    return normalizeEmailUtil(email)
  }

  const normalizePhone = (phone: string): string => {
    return normalizePhoneUtil(phone)
  }

  const normalizeName = (name: string): string => {
    return normalizeNameUtil(name)
  }

  // Server Payload Helper
  const prepareServerPayload = (
    eventName: string,
    params: MetaPixelParams,
    eventId?: string
  ): ServerPayload => {
    const { fbc, fbp } = getValidatedCookies(debug)

    const payload: ServerPayload = {
      event_name: eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: typeof window !== 'undefined' ? window.location.href : '',
      user_data: {
        fbc,
        fbp,
        client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      },
      custom_data: params
    }

    if (testEventCode) {
      payload.test_event_code = testEventCode
    }

    return payload
  }

  // Consent Management
  const grantConsent = () => {
    hasConsent = true
    log('Consent granted')

    // Fire queued events
    if (isPixelLoaded && eventQueue.length > 0) {
      log('Firing queued events:', eventQueue.length)
      eventQueue.forEach(event => {
        const eventOptions: Record<string, unknown> = {}
        if (event.eventId) eventOptions.eventID = event.eventId
        if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
          window.fbq('track', event.name, event.params, eventOptions)
        }
      })
      eventQueue.length = 0
    }
  }

  const revokeConsent = () => {
    hasConsent = false
    eventQueue.length = 0
    log('Consent revoked')
  }

  // Ready State - use getter for reactive value
  const isReady = { get value() { return isPixelLoaded } }

  const onReady = (callback: () => void) => {
    if (isPixelLoaded) {
      callback()
    } else {
      readyCallbacks.push(callback)
    }
  }

  return {
    trackPageView,
    trackViewContent,
    trackSearch,
    trackAddToWishlist,
    trackAddToCart,
    trackInitiateCheckout,
    trackAddPaymentInfo,
    trackPurchase,
    trackSubscribe,
    trackStartTrial,
    trackLead,
    trackCompleteRegistration,
    trackContact,
    trackSubmitApplication,
    trackCustom,
    setAdvancedMatching,
    setAdvancedMatchingHashed,
    getValidatedCookies: getValidatedCookiesWrapper,
    hashValue,
    normalizeEmail,
    normalizePhone,
    normalizeName,
    prepareServerPayload,
    grantConsent,
    revokeConsent,
    isReady,
    onReady
  }
}

// Internal functions for plugin use
export function _setPixelLoaded(loaded: boolean) {
  isPixelLoaded = loaded
  if (loaded) {
    readyCallbacks.forEach(cb => cb())
    readyCallbacks.length = 0
  }
}

export function _setConsent(consent: boolean) {
  hasConsent = consent
}

export function _getEventQueue() {
  return eventQueue
}

export function _getHasConsent() {
  return hasConsent
}
