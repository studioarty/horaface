// Push Notification Handler for HoraFace
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '⚠️ HoraFace - Marque sua Saída!';
  const options = {
    body: data.body || 'Seu turno terminou. Registre sua saída para evitar fechamento automático.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [400, 150, 400, 150, 600, 200, 400],
    tag: 'horaface-alarm',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'mark-exit', title: '📸 Marcar Saída' },
      { action: 'dismiss', title: 'Dispensar' }
    ],
    data: { url: '/marcar-horas', providerId: data.providerId }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('/marcar-horas') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('/marcar-horas');
    })
  );
});
