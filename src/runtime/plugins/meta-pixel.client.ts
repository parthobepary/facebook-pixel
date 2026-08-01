import { defineNuxtPlugin, useRuntimeConfig, useRouter } from '#imports'
import { captureFbclid } from '../utils/validation'
import { _setPixelLoaded, _setConsent, _getEventQueue, _getHasConsent, useMetaPixel } from '../composables/useMetaPixel'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const options = config.public.metaPixel || {}
  const pixelId = config.public.pixelId || ''

  const debug = options.debug || false
  const disabled = options.disabled || false
  const consentMode = options.consentMode || false
  const autoPageView = options.autoPageView || false
  const deferLoad = options.deferLoad !== false // default true
  const immediateLoadPaths = options.immediateLoadPaths || ['/payment', '/checkout', '/success']

  const log = (...args: unknown[]) => {
    if (debug) console.log('[MetaPixel]', ...args)
  }

  if (disabled) {
    log('Pixel disabled')
    return
  }

  if (!pixelId) {
    console.warn('[MetaPixel] No Pixel ID provided. Set NUXT_PUBLIC_PIXEL_ID env variable.')
    return
  }

  // Capture fbclid from URL
  captureFbclid(debug)

  // Check if should load immediately
  const shouldLoadImmediately = (): boolean => {
    const path = window.location.pathname
    return immediateLoadPaths.some(p => path.includes(p))
  }

  // Load the Facebook Pixel SDK
  const loadPixelSDK = () => {
    if (typeof window.fbq === 'function') {
      log('SDK already loaded')
      return
    }

    log('Loading SDK...')

    // Facebook Pixel base code
    const f = window
    const b = document
    const e = 'script'

    if (f.fbq) return

    const n: Window['fbq'] = function (...args: unknown[]) {
      if (n.callMethod) {
        n.callMethod(...args)
      } else {
        n.queue?.push(args)
      }
    }

    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []

    f.fbq = n

    const t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = 'https://connect.facebook.net/en_US/fbevents.js'

    const s = b.getElementsByTagName(e)[0]
    s?.parentNode?.insertBefore(t, s)

    // Initialize pixel
    window.fbq('init', pixelId)
    log('SDK loaded, Pixel ID:', pixelId)

    // Mark as loaded
    _setPixelLoaded(true)

    // Set initial consent if not in consent mode
    if (!consentMode) {
      _setConsent(true)
    }

    // Fire queued events
    const queue = _getEventQueue()
    if (queue.length > 0 && (!consentMode || _getHasConsent())) {
      log('Firing queued events:', queue.length)
      queue.forEach(event => {
        const eventOptions: Record<string, unknown> = {}
        if (event.eventId) eventOptions.eventID = event.eventId
        window.fbq('track', event.name, event.params, eventOptions)
      })
      queue.length = 0
    }
  }

  // Deferred loading logic
  if (!deferLoad || shouldLoadImmediately()) {
    loadPixelSDK()
  } else {
    let loaded = false
    const load = () => {
      if (loaded) return
      loaded = true
      loadPixelSDK()

      // Remove listeners
      ;['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(e => {
        window.removeEventListener(e, load)
      })
    }

    // Load on user interaction
    ;['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(e => {
      window.addEventListener(e, load, { once: true, passive: true })
    })

    // Or after timeout
    setTimeout(load, 3500)

    log('Deferred loading enabled')
  }

  // Auto PageView on route change
  if (autoPageView) {
    const router = useRouter()
    const { trackPageView } = useMetaPixel()

    router.afterEach((to) => {
      trackPageView({
        content_name: to.path
      }, `pv_${Date.now()}`)
    })

    log('Auto PageView enabled')
  }
})
