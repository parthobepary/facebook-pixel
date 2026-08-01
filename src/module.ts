// @ts-ignore

import { defineNuxtModule, addPlugin, createResolver, addImports } from '@nuxt/kit'
import type { MetaPixelOptions } from './types'

export interface ModuleOptions extends MetaPixelOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-meta-pixel',
    configKey: 'metaPixel',
    compatibility: {
      nuxt: '>=3.0.0'
    }
  },
  defaults: {
    disabled: false,
    debug: false,
    testEventCode: '',
    consentMode: false,
    autoPageView: false,
    deferLoad: true,
    immediateLoadPaths: ['/payment', '/checkout', '/success']
  },
  setup(options:any, nuxt:any) {
    const resolver = createResolver(import.meta.url)

    // Add runtime config
    nuxt.options.runtimeConfig.public.metaPixel = options
    // @ts-ignore
    nuxt.options.runtimeConfig.public.pixelId = process.env.PIXELID || process.env.NUXT_PUBLIC_PIXEL_ID || ''

    // Add composable auto-import
    addImports({
      name: 'useMetaPixel',
      from: resolver.resolve('./runtime/composables/useMetaPixel')
    })

    // Add a client-side plugin
    addPlugin({
      src: resolver.resolve('./runtime/plugins/meta-pixel.client'),
      mode: 'client'
    })
  }
})

// @ts-ignore
declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    metaPixel: MetaPixelOptions
    pixelId: string
  }
}
