/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker for background push notifications.
// This file MUST live at the origin root (served from /public/) so the
// browser registers it with scope "/".
//
// Config is passed via query string on registration so we don't have to
// rebuild the SW every time env changes. See src/hooks/useWebPush.js.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

(() => {
  const params = new URL(self.location.href).searchParams;
  const cfg = {
    apiKey: params.get("apiKey"),
    authDomain: params.get("authDomain"),
    projectId: params.get("projectId"),
    storageBucket: params.get("storageBucket"),
    messagingSenderId: params.get("messagingSenderId"),
    appId: params.get("appId"),
  };

  if (!cfg.apiKey || !cfg.projectId) {
    console.warn("[firebase-messaging-sw] missing Firebase config params, notifications disabled");
    return;
  }

  firebase.initializeApp(cfg);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || payload.notification?.title || "Pesan baru";
    const body = data.body || payload.notification?.body || "";
    const options = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "haizur-chat",
      renotify: true,
      data: { url: data.url || "/" },
    };
    self.registration.showNotification(title, options);
  });
})();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return;
        }
      }
      await clients.openWindow(targetUrl);
    })()
  );
});
