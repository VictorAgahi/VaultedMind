'use client';

import { useEffect } from 'react';

export default function PWAHandler() {
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
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');

          // Request permission and subscribe if not already done
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!publicVapidKey) {
              console.error('VAPID public key is missing');
              return;
            }

            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
              });
            }

            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notifications/subscribe`, {
              method: 'POST',
              body: JSON.stringify(subscription),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });
          }
        } catch (err) {
          console.error('PWA Initialization failed:', err);
        }
      };

      registerServiceWorker();
    }
  }, []);

  return null;
}
