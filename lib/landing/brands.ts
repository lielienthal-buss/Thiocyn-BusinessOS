/**
 * HoSB Portfolio Brands — data source.
 * Stories sourced from Brand Bibles in system/memory/work/brands/*.
 * Last verified against Brand Bibles: 2026-04-18.
 * TODO peter-review: final copy polish.
 *
 * Follower counts snapshot from project_business_os_state.md (2026-04-09).
 */

export type BrandAccent = 'teal' | 'coral' | 'indigo' | 'amber' | 'emerald' | 'violet'

export interface Brand {
  slug: string
  name: string
  logo: string
  logoLight: string
  taglineEn: string
  taglineDe: string
  storyEn: string
  storyDe: string
  metric: string
  metricLabelEn: string
  metricLabelDe: string
  accent: BrandAccent
  href?: string
  instagram?: string
  instagramHandle?: string
}

export const BRANDS: Brand[] = [
  {
    slug: 'thiocyn',
    name: 'Thiocyn',
    logo: '/brands/thiocyn-dark.png',
    logoLight: '/brands/thiocyn-white.png',
    taglineEn: 'A molecule your body already knows.',
    taglineDe: 'Ein Molekül, das dein Körper kennt.',
    storyEn:
      'The first hair serum built on a body-own molecule. 30 years of research by Prof. Dr. Axel Kramer. Topical, no pills, no prescription. The flagship.',
    storyDe:
      'Das erste Haarserum auf Basis eines körpereigenen Moleküls. 30 Jahre Forschung von Prof. Dr. Axel Kramer. Topisch, keine Pillen, kein Rezept. Unser Flagship.',
    metric: '100K+',
    metricLabelEn: 'Satisfied customers · 100-day guarantee',
    metricLabelDe: 'Zufriedene Kunden · 100-Tage-Garantie',
    accent: 'teal',
    href: 'https://thiocyn.com',
    instagram: 'https://instagram.com/thiocyn',
    instagramHandle: '@thiocyn',
  },
  {
    slug: 'paigh',
    name: 'Paigh',
    logo: '/brands/paigh.svg',
    logoLight: '/brands/paigh-white.svg',
    taglineEn: 'Fair fashion, genuine comfort.',
    taglineDe: 'Faire & bequeme Mode.',
    storyEn:
      'Harem pants, pareos, and fair fashion basics for women who want clothes that feel as good as they look. WFTO-certified, CO2-neutral shipping. Alltag, not runway.',
    storyDe:
      'Haremshosen, Pareos und faire Mode-Basics für Frauen, die Kleidung wollen die sich gut anfühlt. WFTO-zertifiziert, CO2-neutraler Versand. Alltag, kein Runway.',
    metric: '17,600+',
    metricLabelEn: 'Followers · Ambassador-led growth',
    metricLabelDe: 'Follower · Ambassador-getrieben',
    accent: 'coral',
    href: 'https://paigh.com',
    instagram: 'https://instagram.com/paigh',
    instagramHandle: '@paigh',
  },
  {
    slug: 'dr-severin',
    name: 'Dr. Severin',
    logo: '/brands/dr-severin.avif',
    logoLight: '/brands/dr-severin-white.png',
    taglineEn: 'Results, not empty promises.',
    taglineDe: 'Ergebnisse, keine leeren Versprechen.',
    storyEn:
      'Premium skincare with visible, guaranteed results. Vitamin C, Collagen, Bakuchiol — formulated for outcome. D2C, pharmacies, Amazon, Ankorstore.',
    storyDe:
      'Premium-Hautpflege mit sichtbaren, garantierten Ergebnissen. Vitamin C, Collagen, Bakuchiol — auf Wirkung formuliert. D2C, Apotheken, Amazon, Ankorstore.',
    metric: '3,200+',
    metricLabelEn: 'Followers · Pharmacy + D2C',
    metricLabelDe: 'Follower · Apotheke + D2C',
    accent: 'indigo',
    href: 'https://drseverin.com',
    instagram: 'https://instagram.com/dr.severin',
    instagramHandle: '@dr.severin',
  },
  {
    slug: 'take-a-shot',
    name: 'Take A Shot',
    logo: '/brands/take-a-shot-dark.png',
    logoLight: '/brands/take-a-shot-white.png',
    taglineEn: 'Sustainable sunglasses since 2012.',
    taglineDe: 'Nachhaltige Sonnenbrillen seit 2012.',
    storyEn:
      'Sustainable sunglasses and eyewear, founded 2012. Built for outdoor life, crafted for longevity.',
    storyDe:
      'Nachhaltige Sonnenbrillen und Eyewear, gegründet 2012. Gebaut für Outdoor-Leben, gemacht für Langlebigkeit.',
    metric: '11,000+',
    metricLabelEn: 'Followers · Eyewear + accessories',
    metricLabelDe: 'Follower · Eyewear + Accessoires',
    accent: 'amber',
    href: 'https://takeashot.de',
    instagram: 'https://instagram.com/takeashot.official',
    instagramHandle: '@takeashot.official',
  },
  {
    slug: 'wristr',
    name: 'Wristr',
    logo: '/brands/wristr.svg',
    logoLight: '/brands/wristr-white.svg',
    taglineEn: 'Apple Watch bands, reimagined.',
    taglineDe: 'Apple Watch Armbänder, neu gedacht.',
    storyEn:
      'Apple Watch bands and universal smartwatch bands, direct-to-consumer on Shopify. Our largest social footprint.',
    storyDe:
      'Apple Watch Armbänder und universelle Smartwatch-Bänder, D2C via Shopify. Unsere größte Social-Reach.',
    metric: '57,800+',
    metricLabelEn: 'Followers · Largest social footprint',
    metricLabelDe: 'Follower · Größte Social-Präsenz',
    accent: 'emerald',
    href: 'https://wristr.com',
    instagram: 'https://instagram.com/wristr.official',
    instagramHandle: '@wristr.official',
  },
  {
    slug: 'timber-john',
    name: 'Timber & John',
    logo: '/brands/timber-john-dark.png',
    logoLight: '/brands/timber-john-white.png',
    taglineEn: 'Natural, crafted, timeless.',
    taglineDe: 'Naturverbunden, handwerklich, zeitlos.',
    storyEn:
      'Premium natural fashion and accessories. Handcraft and timeless positioning. Seasonal focus.',
    storyDe:
      'Premium-Naturmode und Accessoires. Handwerkskunst und Zeitlosigkeit. Saisonaler Fokus.',
    metric: '66,000+',
    metricLabelEn: 'Followers · Seasonal community',
    metricLabelDe: 'Follower · Saison-Community',
    accent: 'violet',
    instagram: 'https://instagram.com/timberandjohn',
    instagramHandle: '@timberandjohn',
    // TODO: Timber & John hat aktuell keine eigene Website per memory
  },
]
