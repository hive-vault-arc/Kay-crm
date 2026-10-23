/* Push only: private CRM responses are never cached by this worker. */
self.addEventListener("push", event => {
  let tag = "kay-inbox";
  try { tag = event.data.json().tag || tag; } catch { /* Use a generic inbox alert. */ }
  event.waitUntil(self.registration.showNotification("Nouvelle notification KAY", {
    body: "Ouvrez votre boîte de réception KAY pour la consulter.",
    tag, data: { path: "/notifications" },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL("/notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window" }).then(async windows => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); return existing.focus(); }
    return self.clients.openWindow(url);
  }));
});
