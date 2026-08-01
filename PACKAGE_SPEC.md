# nuxt-meta-pixel

A lightweight Facebook/Meta Pixel package for Nuxt 4. Browser-side only. User controls all parameters.

## What Package Does

| Package Handles | User Handles |
|-----------------|--------------|
| Pixel SDK initialization | All event parameters |
| Plugin auto-registration | Currency, value, content_ids |
| Composable auto-import | event_id generation |
| fbc/fbp cookie validation | Payload preparation |
| Expired cookie cleanup | When to fire events |
| fbclid capture from URL | User data for matching |
| Deferred loading | - |

---

## Installation

```bash
npm install nuxt-meta-pixel
```

---

## Configuration

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-meta-pixel'],

  metaPixel: {
    disabled: false,  // Disable tracking (e.g., in dev)
    debug: false,     // Console log events
  }
})
```

### .env

```env
PIXELID=492334425452200
```

---

## Usage

### Two Types of Data

| Data Type | What It Is | When To Send |
|-----------|------------|--------------|
| **Payload** | Event params (content_ids, value, currency) | Every event |
| **User Data** | PII for matching (email, phone, name) | Once after login |

---

### Step 1: Set User Data (Once After Login)

Call `setAdvancedMatching()` once when user logs in. Package hashes automatically.

```typescript
const { setAdvancedMatching } = useMetaPixel()

// After login - improves EMQ for all subsequent events
const onLogin = async (user) => {
  await setAdvancedMatching({
    em: user.email,           // 'user@example.com' → hashed
    ph: user.phone,           // '+8801712345678' → normalized → hashed
    fn: user.firstName,       // 'John' → hashed
    ln: user.lastName,        // 'Doe' → hashed
    external_id: user.id      // 'user_123' → hashed
  })
}
```

**Internal:** Package re-initializes pixel with hashed user data:
```typescript
fbq('init', pixelId, { em: 'a1b2c3...', ph: 'd4e5f6...', ... })
```

---

### Step 2: Send Event Payload (Every Event)

User prepares payload and passes to track methods.

```vue
<script setup>
const {
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  setAdvancedMatching
} = useMetaPixel()

// ============================================
// PAGE VIEW - minimal payload
// ============================================
onMounted(() => {
  trackPageView({
    content_name: 'Home Page'
  }, 'pv_123abc')  // eventId
})

// ============================================
// VIEW CONTENT - product details
// ============================================
const viewProduct = (product) => {
  trackViewContent({
    content_ids: [product.id],
    content_name: product.title,
    content_type: 'product',
    content_category: product.category,
    value: product.price,
    currency: 'USD'
  }, `vc_${product.id}_${Date.now()}`)
}

// ============================================
// ADD TO CART
// ============================================
const addToCart = (item) => {
  trackAddToCart({
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value: item.price,
    currency: 'BDT',
    num_items: 1
  }, `atc_${item.id}_${Date.now()}`)
}

// ============================================
// INITIATE CHECKOUT
// ============================================
const startCheckout = (cart) => {
  trackInitiateCheckout({
    content_ids: cart.items.map(i => i.id),
    content_name: cart.items.map(i => i.name).join(', '),
    content_type: 'product',
    value: cart.total,
    currency: 'BDT',
    num_items: cart.items.length
  }, `ic_${Date.now()}`)
}

// ============================================
// PURCHASE - use stored eventId for dedup
// ============================================
const completePurchase = (order) => {
  trackPurchase({
    content_ids: order.items.map(i => i.id),
    content_name: order.items.map(i => i.name).join(', '),
    content_type: 'product',
    value: order.total,
    currency: order.currency,
    num_items: order.items.length,
    order_id: order.id
  }, order.pixel_event_id)  // Same eventId used for server CAPI
}
</script>
```

---

### Complete Flow Example

```typescript
// 1. User visits site (anonymous)
trackPageView({ content_name: 'Home' }, 'pv_001')

// 2. User browses products
trackViewContent({
  content_ids: ['course_123'],
  content_name: 'JavaScript Course',
  value: 5000,
  currency: 'BDT'
}, 'vc_course_123')

// 3. User logs in → SET USER DATA (improves EMQ)
await setAdvancedMatching({
  em: 'user@gmail.com',
  ph: '01712345678',
  external_id: 'user_456'
})

// 4. User adds to cart (now has better matching)
trackAddToCart({
  content_ids: ['course_123'],
  content_name: 'JavaScript Course',
  value: 5000,
  currency: 'BDT'
}, 'atc_course_123_1690000000')

// 5. User starts checkout
const checkoutEventId = `ic_${Date.now()}_${Math.random().toString(36).slice(2)}`
trackInitiateCheckout({
  content_ids: ['course_123'],
  value: 5000,
  currency: 'BDT'
}, checkoutEventId)

// 6. Store eventId for purchase (for server dedup)
localStorage.setItem('pixel_event_id', checkoutEventId)

// 7. User completes purchase
const purchaseEventId = localStorage.getItem('pixel_event_id')
trackPurchase({
  content_ids: ['course_123'],
  content_name: 'JavaScript Course',
  value: 5000,
  currency: 'BDT',
  order_id: 'order_789'
}, purchaseEventId)
```

---

## Available Methods

All methods follow same pattern: `method(params, eventId?)`

### Standard Events

```typescript
// Awareness
trackPageView(params?, eventId?)
trackViewContent(params, eventId?)
trackSearch(params, eventId?)

// Engagement
trackAddToWishlist(params, eventId?)
trackAddToCart(params, eventId?)
trackInitiateCheckout(params, eventId?)
trackAddPaymentInfo(params, eventId?)

// Conversion
trackPurchase(params, eventId?)
trackSubscribe(params, eventId?)
trackStartTrial(params, eventId?)

// Lead
trackLead(params?, eventId?)
trackCompleteRegistration(params?, eventId?)
trackContact(params?, eventId?)
trackSubmitApplication(params?, eventId?)

// Custom
trackCustom(eventName, params, eventId?)
```

### Utility Methods

```typescript
// ============================================
// SET USER DATA (call once after login)
// ============================================
// Package normalizes and hashes automatically
await setAdvancedMatching({
  em: 'User@Example.com',     // → lowercase → trim → SHA256
  ph: '+880-171-234-5678',    // → digits only → SHA256
  fn: 'John',                 // → lowercase → SHA256
  ln: 'Doe',                  // → lowercase → SHA256
  external_id: 'user_123'     // → SHA256
})

// ============================================
// GET VALIDATED COOKIES (for server CAPI)
// ============================================
const { fbc, fbp, isValid } = getValidatedCookies()
// fbc: 'fb.1.1690000000.AbCdEf123' or null (if expired/missing)
// fbp: 'fb.1.1690000000.1234567890' or null
// isValid: true if at least one cookie is valid

// Use for your server-side CAPI call
if (isValid) {
  await $fetch('/api/capi', {
    body: { fbc, fbp, event_id: 'purchase_123', ... }
  })
}
```

---

## What Package Handles Internally

### 1. FBC/FBP Cookie Validation

Package validates cookies before every event. Never sends expired cookies.

```typescript
// Internal - user doesn't see this
const validateCookies = () => {
  const fbc = getCookie('_fbc')
  const fbp = getCookie('_fbp')

  let validFbc = null
  let validFbp = null

  // Validate _fbc (expires after 7 days)
  if (fbc) {
    // Format: fb.1.{timestamp}.{fbclid}
    const parts = fbc.split('.')
    if (parts.length >= 4) {
      const timestamp = parseInt(parts[2])
      const age = Date.now() - timestamp
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

      if (age <= maxAge) {
        validFbc = fbc
      } else {
        deleteCookie('_fbc') // Remove expired
        console.warn('[MetaPixel] Expired _fbc removed')
      }
    }
  }

  // Validate _fbp (expires after 90 days)
  if (fbp) {
    // Format: fb.1.{timestamp}.{random}
    const parts = fbp.split('.')
    if (parts.length >= 4) {
      const timestamp = parseInt(parts[2])
      const age = Date.now() - timestamp
      const maxAge = 90 * 24 * 60 * 60 * 1000 // 90 days

      if (age <= maxAge) {
        validFbp = fbp
      } else {
        // Regenerate fresh _fbp
        validFbp = generateFreshFbp()
        setCookie('_fbp', validFbp, { maxAge: 90 * 24 * 60 * 60 })
        console.warn('[MetaPixel] Expired _fbp regenerated')
      }
    }
  }

  return { fbc: validFbc, fbp: validFbp }
}
```

### 2. Auto-capture fbclid from URL

Package captures `fbclid` parameter and creates fresh `_fbc` cookie.

```typescript
// Internal - runs on every page load
const captureFbclid = () => {
  const url = new URL(window.location.href)
  const fbclid = url.searchParams.get('fbclid')

  if (fbclid) {
    const fbc = `fb.1.${Date.now()}.${fbclid}`
    setCookie('_fbc', fbc, {
      maxAge: 7 * 24 * 60 * 60,  // 7 days
      sameSite: 'lax',
      secure: true
    })
  }
}
```

### 3. Deferred Pixel Loading

SDK loads after user interaction or 3.5s (immediate on payment pages).

```typescript
// Internal
const shouldLoadImmediately = () => {
  const path = window.location.pathname
  return path.includes('/payment') ||
         path.includes('/checkout') ||
         path.includes('/success')
}

if (shouldLoadImmediately()) {
  loadPixelSDK()
} else {
  // Wait for interaction or timeout
  const load = () => loadPixelSDK()
  ['mousedown', 'keydown', 'touchstart', 'scroll']
    .forEach(e => window.addEventListener(e, load, { once: true }))
  setTimeout(load, 3500)
}
```

### 4. User Data & Hashing (Advanced Matching)

**Two options for handling user data:**

#### Option A: User Passes Raw Data, Package Hashes (Recommended)

```typescript
const { setAdvancedMatching } = useMetaPixel()

// User passes raw data - package normalizes and hashes
setAdvancedMatching({
  em: 'User@Example.com',    // Package: lowercase, trim, hash
  ph: '+880-171-234-5678',   // Package: remove non-digits, hash
  fn: 'John',                // Package: lowercase, trim, hash
  ln: 'Doe',                 // Package: lowercase, trim, hash
  external_id: 'user_123'    // Package: hash as-is
})
```

**Internal processing:**
```typescript
const normalizeAndHash = (data: AdvancedMatchingData) => {
  const result: Record<string, string> = {}

  if (data.em) {
    // Email: lowercase, trim, then SHA256
    const normalized = data.em.toLowerCase().trim()
    result.em = sha256(normalized)
  }

  if (data.ph) {
    // Phone: remove all non-digits, then SHA256
    // +880-171-234-5678 → 8801712345678 → hash
    const digits = data.ph.replace(/\D/g, '')
    result.ph = sha256(digits)
  }

  if (data.fn) {
    // First name: lowercase, trim, remove special chars, SHA256
    const normalized = data.fn.toLowerCase().trim().replace(/[^a-z]/g, '')
    result.fn = sha256(normalized)
  }

  if (data.ln) {
    // Last name: lowercase, trim, remove special chars, SHA256
    const normalized = data.ln.toLowerCase().trim().replace(/[^a-z]/g, '')
    result.ln = sha256(normalized)
  }

  if (data.external_id) {
    // External ID: hash as-is (no normalization)
    result.external_id = sha256(data.external_id)
  }

  return result
}
```

#### Option B: User Passes Pre-Hashed Data (Full Control)

```typescript
const { setAdvancedMatchingHashed } = useMetaPixel()

// User pre-hashes data themselves
import { sha256 } from 'js-sha256' // or any SHA256 lib

const hashedEmail = sha256('user@example.com') // user normalizes first
const hashedPhone = sha256('8801712345678')    // user removes non-digits first

setAdvancedMatchingHashed({
  em: hashedEmail,
  ph: hashedPhone,
  external_id: sha256('user_123')
})
```

#### Package Provides Hash Utility

```typescript
const { hashValue, normalizePhone, normalizeEmail } = useMetaPixel()

// Utility methods for user who wants control
const email = normalizeEmail('User@Example.com')  // → 'user@example.com'
const phone = normalizePhone('+880-171-2345678') // → '8801712345678'
const hash = hashValue(email)                     // → SHA256 hash
```

---

### Meta's Hashing Requirements

| Field | Normalization | Hash |
|-------|---------------|------|
| `em` (email) | Lowercase, trim whitespace | SHA256 |
| `ph` (phone) | Remove non-digits only (no country code removal) | SHA256 |
| `fn` (first name) | Lowercase, remove non-letters | SHA256 |
| `ln` (last name) | Lowercase, remove non-letters | SHA256 |
| `external_id` | No normalization | SHA256 |
| `ct` (city) | Lowercase, remove spaces | SHA256 |
| `st` (state) | Lowercase 2-letter code | SHA256 |
| `zp` (zip) | First 5 digits only | SHA256 |
| `country` | Lowercase 2-letter code | SHA256 |

**Important:** Meta requires SHA256 hashing. Package uses Web Crypto API:

```typescript
// Internal hash function using Web Crypto API
const sha256 = async (str: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

---

### How Advanced Matching Works (EMQ Improvement)

**When user calls `setAdvancedMatching()`:**

```typescript
// Internal - re-initializes pixel with user data
const setAdvancedMatching = async (userData: AdvancedMatchingData) => {
  // 1. Normalize and hash user data
  const hashed = await normalizeAndHash(userData)

  // 2. Re-initialize pixel with hashed data
  if (typeof window.fbq === 'function') {
    window.fbq('init', pixelId, hashed)
  }

  // 3. Store for future events (optional)
  storedUserData = hashed
}
```

**Best practice - call after login:**

```typescript
// In your login/auth handler
const onLoginSuccess = async (user) => {
  const { setAdvancedMatching } = useMetaPixel()

  await setAdvancedMatching({
    em: user.email,
    ph: user.phone,
    fn: user.firstName,
    ln: user.lastName,
    external_id: user.id
  })

  // Now all subsequent events have better matching
}
```

**EMQ Score Factors:**

| Data Provided | EMQ Impact |
|---------------|------------|
| email only | ~40-50% |
| email + phone | ~60-70% |
| email + phone + name | ~70-80% |
| email + phone + name + external_id | ~80-90% |
| + valid fbc (clicked ad) | 90%+ |

**Note:** `external_id` should be consistent across browser and server events for best deduplication.

---

## Event Firing (Internal)

When user calls any track method, package does this:

```typescript
const trackEvent = (eventName: string, params: object, eventId?: string) => {
  // 1. Validate cookies first
  const { fbc, fbp } = validateCookies()

  // 2. Prepare event options
  const options: Record<string, any> = {}
  if (eventId) {
    options.eventID = eventId
  }

  // 3. Fire event (only if fbq loaded)
  if (typeof window.fbq === 'function') {
    window.fbq('track', eventName, params, options)

    if (debug) {
      console.log('[MetaPixel]', eventName, { params, eventId, fbc, fbp })
    }
  }
}
```

---

## User Responsibilities

Since user controls all parameters:

### 1. Generate Unique event_id

```typescript
// User creates event_id for deduplication
const generateEventId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

// Use it
trackPurchase(payload, generateEventId('purchase'))
```

### 2. Prepare Complete Payload

```typescript
// User prepares all data
const payload = {
  content_ids: ['sku_123', 'sku_456'],
  content_name: 'Course Bundle',
  content_type: 'product',
  content_category: 'Education',
  value: 99.99,
  currency: 'USD',  // User sets
  num_items: 2
}

trackAddToCart(payload, 'cart_abc123')
```

### 3. Handle Server-Side CAPI (If Needed)

Package provides validated cookies for your CAPI:

```typescript
const { fbc, fbp } = getValidatedCookies()

// Send to your backend for CAPI
await $fetch('/api/track', {
  method: 'POST',
  body: {
    event_name: 'Purchase',
    event_id: 'purchase_123', // Same as browser for dedup
    fbc,
    fbp,
    custom_data: payload
  }
})
```

---

## Package Structure

```
nuxt-meta-pixel/
├── src/
│   ├── module.ts                      # Nuxt module
│   ├── runtime/
│   │   ├── plugins/
│   │   │   └── meta-pixel.client.ts   # SDK init, deferred loading
│   │   ├── composables/
│   │   │   └── useMetaPixel.ts        # All track methods
│   │   └── utils/
│   │       ├── cookies.ts             # Cookie get/set/delete
│   │       ├── validation.ts          # fbc/fbp validation
│   │       └── hash.ts                # SHA256 for matching
│   └── types.ts
├── package.json
└── README.md
```

---

## TypeScript Types

```typescript
interface MetaPixelParams {
  content_ids?: string[]
  content_name?: string
  content_type?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
  search_string?: string
  status?: string
  [key: string]: any  // Allow custom params
}

interface AdvancedMatchingData {
  em?: string          // email (raw or hashed)
  ph?: string          // phone (raw or hashed)
  fn?: string          // first name (raw or hashed)
  ln?: string          // last name (raw or hashed)
  ct?: string          // city
  st?: string          // state (2-letter code)
  zp?: string          // zip/postal code
  country?: string     // country (2-letter code)
  external_id?: string // your user ID
}

interface ValidatedCookies {
  fbc: string | null
  fbp: string | null
  isValid: boolean
}

interface UseMetaPixel {
  // Standard Events
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

  // Advanced Matching (EMQ)
  setAdvancedMatching: (data: AdvancedMatchingData) => Promise<void>      // Raw data, package hashes
  setAdvancedMatchingHashed: (data: AdvancedMatchingData) => void         // Pre-hashed data

  // Cookie Management
  getValidatedCookies: () => ValidatedCookies

  // Hash Utilities (for user who wants control)
  hashValue: (value: string) => Promise<string>           // SHA256 hash
  normalizeEmail: (email: string) => string               // lowercase, trim
  normalizePhone: (phone: string) => string               // digits only
  normalizeName: (name: string) => string                 // lowercase, letters only
}
```

---

## Summary

| Feature | How It Works |
|---------|--------------|
| **Pixel ID** | From `PIXELID` env variable |
| **SDK Loading** | Deferred (except payment/checkout pages) |
| **Cookie Validation** | Auto-validates fbc/fbp on every event |
| **Expired Cookies** | Removed (fbc) or regenerated (fbp) |
| **fbclid Capture** | Auto from URL, creates fresh _fbc |
| **Advanced Matching** | User calls `setAdvancedMatching()`, package hashes |
| **Event Params** | 100% user controlled |
| **event_id** | User passes, package just uses it |
| **Currency** | User sets in payload |

**Package = Infrastructure. User = Data.**

---

---

## Suggestions & Enhancements

### 1. Consent Management (GDPR/CCPA)

Don't fire pixel until user consents.

```typescript
// nuxt.config.ts
metaPixel: {
  consentMode: true  // Pixel waits for consent
}

// In your app
const { grantConsent, revokeConsent } = useMetaPixel()

// When user accepts cookies
const onAcceptCookies = () => {
  grantConsent()  // Now pixel initializes and fires queued events
}

// When user rejects
const onRejectCookies = () => {
  revokeConsent()  // Pixel disabled, cookies cleared
}
```

---

### 2. Auto PageView on Route Change

Nuxt router integration - automatic PageView on navigation.

```typescript
// nuxt.config.ts
metaPixel: {
  autoPageView: true  // Fires PageView on every route change
}

// Or manual control
metaPixel: {
  autoPageView: false  // User calls trackPageView() manually
}
```

**Internal:**
```typescript
// Plugin watches route changes
const router = useRouter()
router.afterEach((to) => {
  if (options.autoPageView) {
    trackPageView({
      content_name: to.path
    }, `pv_${Date.now()}`)
  }
})
```

---

### 3. Event Queue (Before Pixel Loads)

Queue events fired before SDK loads, fire when ready.

```typescript
// Internal
const eventQueue: QueuedEvent[] = []

const trackEvent = (name, params, eventId) => {
  if (!isPixelLoaded) {
    // Queue for later
    eventQueue.push({ name, params, eventId, timestamp: Date.now() })
    return
  }

  // Fire immediately
  fbq('track', name, params, { eventID: eventId })
}

// When pixel loads
const onPixelReady = () => {
  // Fire all queued events
  eventQueue.forEach(event => {
    fbq('track', event.name, event.params, { eventID: event.eventId })
  })
  eventQueue.length = 0
}
```

---

### 4. Multiple Pixel Support

Some sites need multiple pixels (e.g., agency + client).

```typescript
// nuxt.config.ts
metaPixel: {
  pixels: [
    { id: process.env.PIXELID_PRIMARY, default: true },
    { id: process.env.PIXELID_SECONDARY }
  ]
}

// Usage - fires to all pixels
trackPurchase(payload, eventId)

// Or specific pixel
trackPurchase(payload, eventId, { pixelId: 'secondary_pixel_id' })
```

---

### 5. Debug Mode with Test Event Code

Integration with Meta Events Manager for testing.

```typescript
// nuxt.config.ts
metaPixel: {
  debug: true,
  testEventCode: 'TEST12345'  // From Events Manager
}

// Internal - adds test_event_code to all events
fbq('track', 'Purchase', params, {
  eventID: eventId,
  // Added in debug mode
  test_event_code: 'TEST12345'
})
```

---

### 6. Payload Validation

Warn developers about invalid data.

```typescript
// Internal validation
const validatePayload = (eventName: string, params: MetaPixelParams) => {
  const warnings: string[] = []

  // Purchase requires value and currency
  if (eventName === 'Purchase') {
    if (!params.value) warnings.push('Purchase missing "value"')
    if (!params.currency) warnings.push('Purchase missing "currency"')
    if (!params.content_ids?.length) warnings.push('Purchase missing "content_ids"')
  }

  // content_ids should be strings
  if (params.content_ids) {
    params.content_ids = params.content_ids.map(id => String(id))
  }

  // value should be number
  if (params.value && typeof params.value !== 'number') {
    params.value = parseFloat(params.value)
  }

  if (debug && warnings.length) {
    console.warn('[MetaPixel]', eventName, warnings)
  }

  return params
}
```

---

### 7. Offline Event Queue

Queue events when offline, send when back online.

```typescript
// Internal
const offlineQueue: QueuedEvent[] = []

const trackEvent = (name, params, eventId) => {
  if (!navigator.onLine) {
    offlineQueue.push({ name, params, eventId })
    localStorage.setItem('pixel_offline_queue', JSON.stringify(offlineQueue))
    return
  }

  fbq('track', name, params, { eventID: eventId })
}

// Listen for online
window.addEventListener('online', () => {
  const queue = JSON.parse(localStorage.getItem('pixel_offline_queue') || '[]')
  queue.forEach(event => {
    fbq('track', event.name, event.params, { eventID: event.eventId })
  })
  localStorage.removeItem('pixel_offline_queue')
})
```

---

### 8. Error Callback

Let user know if something fails.

```typescript
// nuxt.config.ts
metaPixel: {
  onError: (error, event) => {
    console.error('Pixel error:', error, event)
    // Send to your error tracking (Sentry, etc.)
  }
}
```

---

### 9. isReady Check

Check if pixel is ready before tracking.

```typescript
const { isReady, onReady } = useMetaPixel()

// Check
if (isReady.value) {
  trackPurchase(payload, eventId)
}

// Or wait
onReady(() => {
  trackPurchase(payload, eventId)
})
```

---

### 10. Export Utility for Server CAPI

Helper to prepare data for server-side.

```typescript
const { prepareServerPayload } = useMetaPixel()

// Returns formatted data for your CAPI endpoint
const serverData = prepareServerPayload('Purchase', {
  content_ids: ['123'],
  value: 5000,
  currency: 'BDT'
}, 'purchase_123')

// serverData = {
//   event_name: 'Purchase',
//   event_id: 'purchase_123',
//   event_time: 1690000000,
//   event_source_url: 'https://yoursite.com/success',
//   user_data: { fbc, fbp, client_user_agent, ... },
//   custom_data: { content_ids, value, currency }
// }

// Send to your backend
await $fetch('/api/capi', { method: 'POST', body: serverData })
```

---

## Recommended Config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-meta-pixel'],

  metaPixel: {
    disabled: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV !== 'production',
    testEventCode: process.env.META_TEST_CODE,  // For testing
    consentMode: true,       // GDPR compliance
    autoPageView: true,      // Auto track route changes
    deferLoad: true,         // Defer SDK load (default)
    immediateLoadPaths: [    // Load immediately on these paths
      '/payment',
      '/checkout',
      '/success'
    ]
  }
})
```

---

## Priority Recommendations

| Priority | Feature | Why |
|----------|---------|-----|
| **High** | Consent Mode | GDPR/CCPA compliance required |
| **High** | Event Queue | Don't lose events before SDK loads |
| **High** | Payload Validation | Catch errors early |
| **Medium** | Auto PageView | Better DX, less boilerplate |
| **Medium** | Debug Mode + Test Code | Easier debugging |
| **Medium** | prepareServerPayload | Simplifies CAPI integration |
| **Low** | Multiple Pixels | Rare use case |
| **Low** | Offline Queue | Nice to have |

---

## License

MIT
