/* Nymark service worker: only push messages (reminders after training). No caching. */

self.addEventListener("push", (event) => {
  let m = { title: "Nymark", body: "", url: "/" };
  try {
    m = { ...m, ...event.data.json() };
  } catch {
    // An empty or unreadable message still shows something.
  }
  event.waitUntil(
    self.registration.showNotification(m.title, {
      body: m.body,
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      data: { url: m.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && "navigate" in c) return c.navigate(url).then((w) => w?.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
