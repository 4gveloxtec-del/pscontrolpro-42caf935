import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook que detecta se o app está em modo ADM e gerencia o manifest/tema dinamicamente
 * - Rotas /admin/* usam manifest-admin.json
 * - Outras rotas usam manifest.json (revendedor)
 * 
 * Production-safe: All operations are wrapped in try-catch to prevent breaking the app
 */
export function useAdminManifest() {
  const location = useLocation();
  
  useEffect(() => {
    try {
      const isAdminRoute = location.pathname.startsWith('/admin');
      
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      
      if (isAdminRoute) {
        // Configurar para Admin PWA
        if (manifestLink) {
          manifestLink.setAttribute('href', '/manifest-admin.json');
        }
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', '#1e40af');
        }
        if (appleTouchIcon) {
          appleTouchIcon.setAttribute('href', '/admin-icon-192.png');
        }
        if (appleTitle) {
          appleTitle.setAttribute('content', 'ADM');
        }
        document.title = 'Painel ADM - Sistema de Gestão';
        
        // Registrar service worker do admin (non-blocking)
        registerServiceWorker('/sw-admin.js');
      } else {
        // Configurar para Revendedor PWA
        if (manifestLink) {
          manifestLink.setAttribute('href', '/manifest.json');
        }
        if (themeColorMeta) {
          themeColorMeta.setAttribute('content', '#e50914');
        }
        if (appleTouchIcon) {
          appleTouchIcon.setAttribute('href', '/icon-192.png');
        }
        if (appleTitle) {
          appleTitle.setAttribute('content', 'PSControl');
        }
        
        // Registrar service worker do revendedor (non-blocking)
        registerServiceWorker('/sw.js');
      }
    } catch (error) {
      // Silently fail - don't break the app
      console.warn('[AdminManifest] Error updating manifest:', error);
    }
  }, [location.pathname]);
}

/**
 * Non-blocking service worker registration
 */
function registerServiceWorker(swPath: string) {
  // Skip if not supported or not secure context
  if (!('serviceWorker' in navigator)) return;
  if (typeof window !== 'undefined' && !window.isSecureContext) return;
  
  // Non-blocking registration after a small delay
  setTimeout(() => {
    navigator.serviceWorker.register(swPath, { 
      scope: '/',
      updateViaCache: 'none'
    }).catch(() => {
      // Silently fail - SW is optional
    });
  }, 1000);
}

/**
 * Componente wrapper que aplica o hook de manifest
 */
export function AdminManifestProvider({ children }: { children: React.ReactNode }) {
  useAdminManifest();
  return <>{children}</>;
}
