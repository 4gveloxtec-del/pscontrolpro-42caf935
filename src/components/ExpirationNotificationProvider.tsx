import { useExpirationNotifications } from '@/hooks/useExpirationNotifications';
import { useExternalAppsExpirationNotifications } from '@/hooks/useExternalAppsExpirationNotifications';
import { usePaymentNotifications } from '@/hooks/usePaymentNotifications';

export function ExpirationNotificationProvider({ children }: { children: React.ReactNode }) {
  // These hooks handle all the notification logic internally
  useExpirationNotifications();
  useExternalAppsExpirationNotifications();
  usePaymentNotifications();
  
  return <>{children}</>;
}
