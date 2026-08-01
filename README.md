# nuxt-meta-pixel

A lightweight Facebook/Meta Pixel package for Nuxt 3+. Browser-side tracking with automatic cookie validation, deferred loading, and advanced matching support.

## Installation

```bash
npm install nuxt-meta-pixel
```

## Configuration

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-meta-pixel'],

  metaPixel: {
    disabled: false,           // Disable tracking (e.g., in dev)
    debug: false,              // Console log events
    consentMode: false,        // GDPR/CCPA - wait for consent
    autoPageView: false,       // Auto-track route changes
    deferLoad: true,           // Defer SDK load until interaction
    immediateLoadPaths: [      // Load immediately on these paths
      '/payment',
      '/checkout',
      '/success'
    ]
  }
})
```

### Environment Variables

```env
PIXELID=492334425452200
```

Or use `NUXT_PUBLIC_PIXEL_ID`.

---

## Usage

### Basic Tracking

```vue
<script setup>
const { trackPageView, trackAddToCart, trackPurchase } = useMetaPixel()

// Track page view
onMounted(() => {
  trackPageView({ content_name: 'Home Page' }, 'pv_123')
})

// Track add to cart
const addToCart = (product) => {
  trackAddToCart({
    content_ids: [product.id],
    content_name: product.name,
    value: product.price,
    currency: 'USD'
  }, `atc_${product.id}_${Date.now()}`)
}

// Track purchase
const completePurchase = (order) => {
  trackPurchase({
    content_ids: order.items.map(i => i.id),
    value: order.total,
    currency: 'USD',
    order_id: order.id
  }, order.eventId)
}
</script>
```

### Advanced Matching (Improve EMQ)

Call `setAdvancedMatching()` once after user login. Package automatically normalizes and hashes data.

```typescript
const { setAdvancedMatching } = useMetaPixel()

const onLogin = async (user) => {
  await setAdvancedMatching({
    em: user.email,           // 'User@Example.com' → normalized → hashed
    ph: user.phone,           // '+880-171-2345678' → digits only → hashed
    fn: user.firstName,       // 'John' → lowercase → hashed
    ln: user.lastName,        // 'Doe' → lowercase → hashed
    external_id: user.id      // 'user_123' → hashed
  })
}
```

### Consent Mode (GDPR/CCPA)

```typescript
// nuxt.config.ts
metaPixel: {
  consentMode: true
}
```

```typescript
const { grantConsent, revokeConsent } = useMetaPixel()

// When user accepts cookies
const onAcceptCookies = () => {
  grantConsent()  // Pixel initializes, queued events fire
}

// When user rejects
const onRejectCookies = () => {
  revokeConsent()  // Tracking disabled
}
```

### Server-Side CAPI Integration

```typescript
const { getValidatedCookies, prepareServerPayload } = useMetaPixel()

// Get validated cookies for your backend
const { fbc, fbp, isValid } = getValidatedCookies()

if (isValid) {
  await $fetch('/api/capi', {
    method: 'POST',
    body: { fbc, fbp, event_id: 'purchase_123', ... }
  })
}

// Or use prepareServerPayload helper
const serverData = prepareServerPayload('Purchase', {
  content_ids: ['123'],
  value: 5000,
  currency: 'USD'
}, 'purchase_123')

await $fetch('/api/capi', { method: 'POST', body: serverData })
```

---

## API Reference

### Tracking Methods

All methods accept `(params, eventId?)`.

| Method | Event | Required Params |
|--------|-------|-----------------|
| `trackPageView()` | PageView | None |
| `trackViewContent()` | ViewContent | content_ids |
| `trackSearch()` | Search | search_string |
| `trackAddToWishlist()` | AddToWishlist | content_ids |
| `trackAddToCart()` | AddToCart | content_ids, value, currency |
| `trackInitiateCheckout()` | InitiateCheckout | value, currency |
| `trackAddPaymentInfo()` | AddPaymentInfo | None |
| `trackPurchase()` | Purchase | content_ids, value, currency |
| `trackSubscribe()` | Subscribe | value, currency |
| `trackStartTrial()` | StartTrial | value, currency |
| `trackLead()` | Lead | None |
| `trackCompleteRegistration()` | CompleteRegistration | None |
| `trackContact()` | Contact | None |
| `trackSubmitApplication()` | SubmitApplication | None |
| `trackCustom()` | Custom | eventName, params |

### Advanced Matching

| Method | Description |
|--------|-------------|
| `setAdvancedMatching(data)` | Set user data (auto-hashed) |
| `setAdvancedMatchingHashed(data)` | Set pre-hashed user data |

### Utilities

| Method | Description |
|--------|-------------|
| `getValidatedCookies()` | Get validated fbc/fbp cookies |
| `hashValue(value)` | SHA256 hash a string |
| `normalizeEmail(email)` | Normalize email (lowercase, trim) |
| `normalizePhone(phone)` | Normalize phone (digits only) |
| `normalizeName(name)` | Normalize name (lowercase, letters only) |
| `prepareServerPayload(event, params, eventId)` | Prepare data for CAPI |

### Consent & State

| Method | Description |
|--------|-------------|
| `grantConsent()` | Enable tracking, fire queued events |
| `revokeConsent()` | Disable tracking, clear queue |
| `isReady` | `{ value: boolean }` - Pixel loaded state |
| `onReady(callback)` | Execute callback when pixel ready |

---

## Event Parameters

```typescript
interface MetaPixelParams {
  content_ids?: string[]      // Product/content IDs
  content_name?: string       // Product/page name
  content_type?: string       // 'product' | 'product_group'
  content_category?: string   // Category
  value?: number              // Monetary value
  currency?: string           // ISO 4217 currency code
  num_items?: number          // Number of items
  search_string?: string      // Search query
  status?: string             // Registration status
  order_id?: string           // Order ID
}
```

---

## Advanced Matching Fields

| Field | Normalization | Example |
|-------|---------------|---------|
| `em` | lowercase, trim | `user@example.com` |
| `ph` | digits only | `8801712345678` |
| `fn` | lowercase, letters only | `john` |
| `ln` | lowercase, letters only | `doe` |
| `ct` | lowercase, no spaces | `dhaka` |
| `st` | 2-letter code | `ny` |
| `zp` | first 5 digits | `12345` |
| `country` | 2-letter code | `us` |
| `external_id` | no normalization | `user_123` |

---

## Cookie Handling

Package automatically manages Meta cookies:

| Cookie | Max Age | Behavior |
|--------|---------|----------|
| `_fbc` | 7 days | Captured from `fbclid` URL param, deleted when expired |
| `_fbp` | 90 days | Auto-generated, regenerated when expired |

---

## Deferred Loading

By default, SDK loads after:
- User interaction (click, keypress, touch, scroll), OR
- 3.5 second timeout

Exceptions - loads immediately on:
- `/payment`
- `/checkout`
- `/success`

Configure with `immediateLoadPaths` option.

---

## Event Deduplication

Use `eventId` parameter for browser + server deduplication:

```typescript
// Browser
const eventId = `purchase_${orderId}_${Date.now()}`
trackPurchase(payload, eventId)

// Server CAPI - use same eventId
await sendCAPI({ event_id: eventId, ... })
```

---

## Complete Example

```typescript
// 1. User visits (anonymous)
trackPageView({ content_name: 'Home' }, 'pv_001')

// 2. User browses products
trackViewContent({
  content_ids: ['SKU123'],
  content_name: 'Blue T-Shirt',
  content_type: 'product',
  value: 29.99,
  currency: 'USD'
}, 'vc_SKU123_1234567890')

// 3. User logs in → set advanced matching
await setAdvancedMatching({
  em: 'user@example.com',
  ph: '+1-555-123-4567',
  external_id: 'user_789'
})

// 4. User adds to cart
trackAddToCart({
  content_ids: ['SKU123'],
  content_name: 'Blue T-Shirt',
  value: 29.99,
  currency: 'USD',
  num_items: 1
}, 'atc_SKU123_1234567891')

// 5. User initiates checkout
const checkoutEventId = `ic_${Date.now()}`
trackInitiateCheckout({
  content_ids: ['SKU123'],
  value: 29.99,
  currency: 'USD',
  num_items: 1
}, checkoutEventId)

// 6. User completes purchase
trackPurchase({
  content_ids: ['SKU123'],
  content_name: 'Blue T-Shirt',
  value: 29.99,
  currency: 'USD',
  num_items: 1,
  order_id: 'ORDER_001'
}, 'purchase_ORDER_001')

// 7. Send to server CAPI with same eventId
const { fbc, fbp } = getValidatedCookies()
await $fetch('/api/capi', {
  method: 'POST',
  body: {
    event_name: 'Purchase',
    event_id: 'purchase_ORDER_001',
    fbc,
    fbp,
    custom_data: { value: 29.99, currency: 'USD' }
  }
})
```

---

## License

MIT
