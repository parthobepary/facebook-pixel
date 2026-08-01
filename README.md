# @parthobepary/nuxt-meta-pixel

A lightweight Facebook/Meta Pixel package for Nuxt 3+. Browser-side tracking with automatic cookie validation, deferred loading, and advanced matching support.

## Installation

```bash
yarn add @parthobepary/nuxt-meta-pixel
```

```bash
npm install @parthobepary/nuxt-meta-pixel
```

## Configuration

### nuxt.config.ts

```javascript
export default defineNuxtConfig({
  modules: ["@parthobepary/nuxt-meta-pixel"],

  metaPixel: {
    disabled: false,
    debug: false,
    consentMode: false,
    autoPageView: false,
    deferLoad: true,
    immediateLoadPaths: ["/payment", "/checkout", "/success"]
  }
})
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `disabled` | `boolean` | `false` | Disable tracking (useful in development) |
| `debug` | `boolean` | `false` | Enable console logging for events |
| `testEventCode` | `string` | `''` | Test Event Code from Meta Events Manager |
| `consentMode` | `boolean` | `false` | GDPR/CCPA - wait for user consent |
| `autoPageView` | `boolean` | `false` | Auto-track PageView on route changes |
| `deferLoad` | `boolean` | `true` | Defer SDK load until user interaction |
| `immediateLoadPaths` | `string[]` | `['/payment', '/checkout', '/success']` | Paths where SDK loads immediately |

### Environment Variables

```env
PIXELID=492334425452200
```

Or use `NUXT_PUBLIC_PIXEL_ID`.

---

## Test Mode

Use `testEventCode` to test events in Meta Events Manager without affecting production data.

### Get Test Event Code

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Select your Pixel
3. Click **Test Events** tab
4. Copy the **Test Event Code** (e.g., `TEST12345`)

### Configure Test Mode

```javascript
export default defineNuxtConfig({
  modules: ["@parthobepary/nuxt-meta-pixel"],

  metaPixel: {
    debug: true,
    testEventCode: "TEST12345"
  }
})
```

Events will appear in the **Test Events** tab in real-time.

---

## Usage

### Basic Tracking

```vue
<script setup>
const { trackPageView, trackAddToCart, trackPurchase } = useMetaPixel()

onMounted(() => {
  trackPageView({ content_name: 'Home Page' }, 'pv_123')
})

const addToCart = (product) => {
  trackAddToCart({
    content_ids: [product.id],
    content_name: product.name,
    value: product.price,
    currency: 'USD'
  }, `atc_${product.id}_${Date.now()}`)
}

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

```javascript
const { setAdvancedMatching } = useMetaPixel()

const onLogin = async (user) => {
  await setAdvancedMatching({
    em: user.email,
    ph: user.phone,
    fn: user.firstName,
    ln: user.lastName,
    external_id: user.id
  })
}
```

### Consent Mode (GDPR/CCPA)

```javascript
// nuxt.config.ts
metaPixel: {
  consentMode: true
}
```

```javascript
const { grantConsent, revokeConsent } = useMetaPixel()

const onAcceptCookies = () => {
  grantConsent()
}

const onRejectCookies = () => {
  revokeConsent()
}
```

### Server-Side CAPI Integration

```javascript
const { getValidatedCookies, prepareServerPayload } = useMetaPixel()

const { fbc, fbp, isValid } = getValidatedCookies()

if (isValid) {
  await $fetch('/api/capi', {
    method: 'POST',
    body: { fbc, fbp, event_id: 'purchase_123' }
  })
}
```

---

## API Reference

### Tracking Methods

All methods accept `(params, eventId?)`.

| Method | Event |
|--------|-------|
| `trackPageView()` | PageView |
| `trackViewContent()` | ViewContent |
| `trackSearch()` | Search |
| `trackAddToWishlist()` | AddToWishlist |
| `trackAddToCart()` | AddToCart |
| `trackInitiateCheckout()` | InitiateCheckout |
| `trackAddPaymentInfo()` | AddPaymentInfo |
| `trackPurchase()` | Purchase |
| `trackSubscribe()` | Subscribe |
| `trackStartTrial()` | StartTrial |
| `trackLead()` | Lead |
| `trackCompleteRegistration()` | CompleteRegistration |
| `trackContact()` | Contact |
| `trackSubmitApplication()` | SubmitApplication |
| `trackCustom()` | Custom |

### Utilities

| Method | Description |
|--------|-------------|
| `setAdvancedMatching(data)` | Set user data (auto-hashed) |
| `setAdvancedMatchingHashed(data)` | Set pre-hashed user data |
| `getValidatedCookies()` | Get validated fbc/fbp cookies |
| `hashValue(value)` | SHA256 hash a string |
| `normalizeEmail(email)` | Normalize email |
| `normalizePhone(phone)` | Normalize phone |
| `normalizeName(name)` | Normalize name |
| `prepareServerPayload()` | Prepare data for CAPI |
| `grantConsent()` | Enable tracking |
| `revokeConsent()` | Disable tracking |
| `isReady` | Pixel loaded state |
| `onReady(callback)` | Execute when pixel ready |

---

## Event Parameters

```javascript
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
  order_id?: string
}
```

---

## Advanced Matching Fields

| Field | Normalization |
|-------|---------------|
| `em` | lowercase, trim |
| `ph` | digits only |
| `fn` | lowercase, letters only |
| `ln` | lowercase, letters only |
| `ct` | lowercase, no spaces |
| `st` | 2-letter code |
| `zp` | first 5 digits |
| `country` | 2-letter code |
| `external_id` | no normalization |

---

## Cookie Handling

| Cookie | Max Age | Behavior |
|--------|---------|----------|
| `_fbc` | 7 days | Captured from `fbclid` URL param |
| `_fbp` | 90 days | Auto-generated |

---

## License

MIT
