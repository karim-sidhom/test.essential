/**
 * LORD SYSTEM PWA - Configuration
 * Personnalisez l'application en éditant ce fichier
 */

const PWA_CONFIG = {
  // ── Infos générales ──
  app: {
    name: 'LORD SYSTEM',
    fullName: 'LORD SYSTEM — نظام التنقل الذكي',
    shortName: 'LORD',
    description: 'نظام ملاحة ذكي لإيجاد أقرب الخدمات والمشاعر الدينية',
    version: '1.0.0',
    language: 'ar',
    direction: 'rtl'
  },

  // ── URLs ──
  urls: {
    manifest: '/manifest.json',
    serviceWorker: '/sw.js',
    homepage: '/',
    apiBase: 'https://api.your-domain.com'
  },

  // ── Couleurs ──
  colors: {
    primary: '#0a0500',        // Noir profond
    accent: '#e87722',         // Or brillant
    accentBright: '#f5a623',   // Or clair
    accentDeep: '#7a3a00',     // Or foncé
    background: '#0a0500',
    text: '#fff4e8',
    textDim: '#c89060',
    card: 'rgba(20,8,0,0.92)',
    cardBorder: 'rgba(232,119,34,0.4)'
  },

  // ── Service Worker ──
  serviceWorker: {
    enabled: true,
    cacheName: 'lord-system-v1',
    cacheStrategy: 'network-first', // 'network-first', 'cache-first', 'stale-while-revalidate'
    precacheAssets: true,
    autoUpdate: true,
    updateCheckInterval: 60000 // 1 minute en millisecondes
  },

  // ── Notifications ──
  notifications: {
    enabled: true,
    askPermission: true,
    sound: true,
    badge: '/icon-192.png',
    icon: '/icon-192.png'
  },

  // ── Localisation ──
  localization: {
    defaultLanguage: 'ar',
    supportedLanguages: ['ar', 'fr', 'en'],
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h', // '12h' ou '24h'
    currency: 'TND' // Dinar Tunisien
  },

  // ── Features ──
  features: {
    offline: true,
    darkMode: false, // Toujours dark dans ce design
    animations: true,
    soundEffects: false,
    hapticFeedback: true,
    geolocation: true,
    speech: true
  },

  // ── API Services ──
  services: {
    prayer: {
      name: 'مواقيت الصلاة',
      enabled: true,
      apiUrl: 'https://api.aladhan.com/v1/timingsByCity'
    },
    maps: {
      name: 'الخرائط',
      enabled: true,
      provider: 'google', // 'google', 'openstreetmap'
      apiKey: 'YOUR_MAPS_API_KEY_HERE'
    },
    location: {
      name: 'الموقع الجغرافي',
      enabled: true,
      timeout: 5000, // millisecondes
      enableHighAccuracy: false
    }
  },

  // ── Analytics ──
  analytics: {
    enabled: false,
    trackingId: 'UA-XXXXXXXXX-X',
    provider: 'google', // 'google', 'plausible', 'matomo'
    privacyMode: true
  },

  // ── Sécurité ──
  security: {
    cspEnabled: true,
    corsEnabled: true,
    httpsRequired: true,
    allowedHosts: ['your-domain.com', 'api.your-domain.com'],
    secureHeaders: true
  },

  // ── Cache ──
  cache: {
    maxAge: {
      html: 3600,          // 1 heure
      assets: 31536000,    // 1 an
      api: 300             // 5 minutes
    },
    maxSize: {
      images: 52428800,    // 50 MB
      scripts: 10485760,   // 10 MB
      fonts: 5242880       // 5 MB
    }
  },

  // ── Logging ──
  logging: {
    enabled: true,
    level: 'info', // 'debug', 'info', 'warn', 'error'
    persistLogs: false,
    sendToServer: false
  },

  // ── Personnalisation UI ──
  ui: {
    theme: 'dark', // 'light', 'dark', 'auto'
    fontSize: 'medium', // 'small', 'medium', 'large'
    compactMode: false,
    showAnimations: true,
    showGradients: true,
    reduceMotion: false
  },

  // ── Bannières festives ──
  festiveBanners: {
    enabled: true,
    checkDate: true,
    events: [
      { date: '01-01', title: 'حديث السنة', emoji: '🎉', show: true },
      { date: '05-01', title: 'عيد العمال', emoji: '🪴', show: true },
      { date: '07-25', title: 'يوم الجمهورية', emoji: '🇹🇳', show: true },
      { date: '10-15', title: 'يوم الثورة', emoji: '✊', show: true }
    ]
  },

  // ── أصوات وتنبيهات ──
  audio: {
    enabled: true,
    volume: 0.5,
    sounds: {
      notification: true,
      success: true,
      error: true,
      locationFound: true
    }
  },

  // ── تطوير ──
  development: {
    enabled: false,
    debugMode: false,
    mockData: false,
    showPerformance: false,
    showErrors: true,
    logRequests: false
  }
};

// Export pour les scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWA_CONFIG;
}
