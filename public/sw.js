self.addEventListener("push", function (event) {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "Taprooster", body: event.data.text() }; }
  const { title = "Taprooster", body = "", url = "/dashboard", tag = "taprooster" } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/apple-icon",
      badge: "/apple-icon",
      tag,
      renotify: true,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
