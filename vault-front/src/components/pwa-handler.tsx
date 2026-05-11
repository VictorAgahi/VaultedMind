'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/api.service';

export default function PWAHandler() {
  const [refreshing, setRefreshing] = useState(false);
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        if (refreshing) return;
        setRefreshing(true);
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

      return () => {
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }
  }, [refreshing]);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registerServiceWorker = async () => {
        try {
          console.log('[PWA] Registering Service Worker...');
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('[PWA] Service Worker registered:', registration.scope);

          // Request permission
          const permission = await Notification.requestPermission();
          console.log('[PWA] Notification permission:', permission);

          if (permission === 'granted') {
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!publicVapidKey) {
              console.error('[PWA] VAPID public key is missing');
              return;
            }

            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
              console.log('[PWA] Creating new push subscription...');
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
              });
            }

            console.log('[PWA] Subscription object:', subscription);

            // Send subscription to backend using apiService
            await apiService.post('/notifications/subscribe', subscription);
            console.log('[PWA] Subscription sent to backend successfully');
          }
        } catch (err) {
          console.error('[PWA] Initialization failed:', err);
        }
      };

      registerServiceWorker();
    }
  }, []);

  return null;
}
