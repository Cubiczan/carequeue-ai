/**
 * Multi-language Support (i18n)
 * 
 * Internationalization service for the mobile app
 * - Multiple language support
 * - Dynamic language switching
 * - RTL language support
 * - Locale-specific formatting
 */

import { offlineSync } from './offlineSync';

type LanguageCode = 'en' | 'es' | 'zh' | 'de' | 'fr' | 'ja' | 'ko';

interface Translation {
  [key: string]: string | Translation;
}

const translations: Record<LanguageCode, Translation> = {
  en: {
    // Common
    'app.name': 'Battery ERP',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.workOrders': 'Work Orders',
    'nav.inventory': 'Inventory',
    'nav.scan': 'Scan',
    'nav.quality': 'Quality',
    'nav.batches': 'Batches',
    'nav.hazmat': 'HazMat',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    
    // Dashboard
    'dashboard.activeWO': 'Active WO',
    'dashboard.quality': 'Quality',
    'dashboard.batches': 'Batches',
    'dashboard.lowStock': 'Low Stock',
    
    // Work Orders
    'wo.new': 'New Work Order',
    'wo.status.pending': 'Pending',
    'wo.status.in_progress': 'In Progress',
    'wo.status.completed': 'Completed',
    'wo.dueDate': 'Due Date',
    'wo.quantity': 'Quantity',
    
    // Inventory
    'inventory.inStock': 'In Stock',
    'inventory.outOfStock': 'Out of Stock',
    'inventory.lowStock': 'Low Stock',
    'inventory.warehouse': 'Warehouse',
    
    // Quality
    'quality.inspection': 'Inspection',
    'quality.pass': 'Pass',
    'quality.fail': 'Fail',
    'quality.grade': 'Grade',
    
    // HazMat
    'hazmat.manifest': 'Manifest',
    'hazmat.compliance': 'Compliance',
    'hazmat.storage': 'Storage',
    'hazmat.alert': 'Alert',
    
    // Settings
    'settings.language': 'Language',
    'settings.notifications': 'Notifications',
    'settings.theme': 'Theme',
    'settings.account': 'Account',
  },
  
  es: {
    // Common
    'app.name': 'ERP de Baterías',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    
    // Navigation
    'nav.dashboard': 'Tablero',
    'nav.workOrders': 'Órdenes',
    'nav.inventory': 'Inventario',
    'nav.scan': 'Escanear',
    'nav.quality': 'Calidad',
    'nav.batches': 'Lotes',
    'nav.hazmat': 'Peligrosos',
    'nav.analytics': 'Análisis',
    'nav.settings': 'Configuración',
    
    // Dashboard
    'dashboard.activeWO': 'Órdenes Activas',
    'dashboard.quality': 'Calidad',
    'dashboard.batches': 'Lotes',
    'dashboard.lowStock': 'Stock Bajo',
    
    // Work Orders
    'wo.new': 'Nueva Orden',
    'wo.status.pending': 'Pendiente',
    'wo.status.in_progress': 'En Progreso',
    'wo.status.completed': 'Completado',
    'wo.dueDate': 'Fecha Límite',
    'wo.quantity': 'Cantidad',
    
    // Settings
    'settings.language': 'Idioma',
    'settings.notifications': 'Notificaciones',
    'settings.theme': 'Tema',
    'settings.account': 'Cuenta',
  },
  
  zh: {
    // Common
    'app.name': '电池 ERP',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.workOrders': '工单',
    'nav.inventory': '库存',
    'nav.scan': '扫描',
    'nav.quality': '质量',
    'nav.batches': '批次',
    'nav.hazmat': '危险品',
    'nav.analytics': '分析',
    'nav.settings': '设置',
    
    // Dashboard
    'dashboard.activeWO': '活跃工单',
    'dashboard.quality': '质量',
    'dashboard.batches': '批次',
    'dashboard.lowStock': '低库存',
    
    // Settings
    'settings.language': '语言',
    'settings.notifications': '通知',
    'settings.theme': '主题',
  },
  
  de: {
    'app.name': 'Batterie ERP',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'nav.dashboard': 'Dashboard',
    'nav.workOrders': 'Aufträge',
    'nav.inventory': 'Inventar',
    'settings.language': 'Sprache',
  },
  
  fr: {
    'app.name': 'ERP Batterie',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'nav.dashboard': 'Tableau de bord',
    'nav.workOrders': 'Ordres',
    'nav.inventory': 'Inventaire',
    'settings.language': 'Langue',
  },
  
  ja: {
    'app.name': 'バッテリー ERP',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'nav.dashboard': 'ダッシュボード',
    'nav.workOrders': '作業指示',
    'nav.inventory': '在庫',
    'settings.language': '言語',
  },
  
  ko: {
    'app.name': '배터리 ERP',
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    'nav.dashboard': '대시보드',
    'nav.workOrders': '작업 지시',
    'nav.inventory': '재고',
    'settings.language': '언어',
  },
};

// RTL languages
const rtlLanguages: LanguageCode[] = [] as LanguageCode[]; // Add Arabic/Hebrew when supported

class I18nService {
  private currentLanguage: LanguageCode = 'en';
  private fallbackLanguage: LanguageCode = 'en';
  private listeners: Set<() => void> = new Set();

  /**
   * Initialize i18n service
   */
  async initialize(): Promise<void> {
    // Load saved language preference
    const saved = await offlineSync.getCachedData('language_preference');
    if (saved) {
      this.currentLanguage = saved as LanguageCode;
    } else {
      // Detect device language
      this.currentLanguage = this.detectDeviceLanguage();
    }
  }

  /**
   * Detect device language
   */
  private detectDeviceLanguage(): LanguageCode {
    // In React Native, use:
    // const deviceLocale = Localization.locale.slice(0, 2);
    const deviceLocale = 'en'; // Fallback
    
    const supportedLanguages = Object.keys(translations) as LanguageCode[];
    return supportedLanguages.includes(deviceLocale as LanguageCode)
      ? (deviceLocale as LanguageCode)
      : 'en';
  }

  /**
   * Get current language
   */
  getLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  /**
   * Set language
   */
  async setLanguage(language: LanguageCode): Promise<void> {
    if (!translations[language]) {
      console.warn(`Language ${language} not supported`);
      return;
    }

    this.currentLanguage = language;
    await offlineSync.cacheData('language_preference', language);
    this.notifyListeners();
  }

  /**
   * Get translation
   */
  t(key: string, params?: Record<string, string | number>): string {
    let translation: string | Translation | undefined = translations[this.currentLanguage][key];
    
    // Fallback to English if translation not found
    if (!translation && this.currentLanguage !== 'en') {
      translation = translations['en'][key];
    }
    
    if (!translation) {
      console.warn(`Translation not found: ${key}`);
      return key; // Return key as fallback
    }
    
    if (typeof translation !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = (translation as string).replace(`{${param}}`, String(value));
      });
    }

    return translation;
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): Array<{ code: LanguageCode; name: string; nativeName: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
    ];
  }

  /**
   * Check if current language is RTL
   */
  isRTL(): boolean {
    return rtlLanguages.includes(this.currentLanguage);
  }

  /**
   * Subscribe to language changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Format date according to locale
   */
  formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
    const locales: Record<LanguageCode, string> = {
      en: 'en-US',
      es: 'es-ES',
      zh: 'zh-CN',
      de: 'de-DE',
      fr: 'fr-FR',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };

    const options: Intl.DateTimeFormatOptions = format === 'short'
      ? { year: 'numeric', month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };

    return date.toLocaleDateString(locales[this.currentLanguage], options);
  }

  /**
   * Format number according to locale
   */
  formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
    const locales: Record<LanguageCode, string> = {
      en: 'en-US',
      es: 'es-ES',
      zh: 'zh-CN',
      de: 'de-DE',
      fr: 'fr-FR',
      ja: 'ja-JP',
      ko: 'ko-KR',
    };

    return number.toLocaleString(locales[this.currentLanguage], options);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return this.formatNumber(amount, {
      style: 'currency',
      currency,
    });
  }
}

// Export singleton instance
export const i18n = new I18nService();
export default i18n;

// Helper function for components
export function useTranslation() {
  return {
    t: i18n.t.bind(i18n),
    language: i18n.getLanguage(),
    setLanguage: i18n.setLanguage.bind(i18n),
    isRTL: i18n.isRTL.bind(i18n),
  };
}
