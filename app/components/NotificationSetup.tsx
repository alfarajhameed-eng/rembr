"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export default function NotificationSetup() {
  const [status, setStatus] = useState<"checking" | "off" | "on" | "unsupported">("checking");

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    }
    check();
  }, []);

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("off");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      )
    });

    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub)
    });

    setStatus("on");
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "on") {
    return (
      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--ink-soft)",
          marginBottom: "1.2rem"
        }}
      >
        ✓ Notifications are on
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      style={{
        background: "var(--salmon-soft)",
        color: "var(--salmon-dark)",
        border: "none",
        borderRadius: "999px",
        padding: "0.55rem 1.1rem",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        marginBottom: "1.2rem"
      }}
    >
      Turn on notifications
    </button>
  );
}
