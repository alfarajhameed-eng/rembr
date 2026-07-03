"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Rembr</h1>
      <p>A reminder system that learns you.</p>

      {isIOS && !isStandalone && (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            border: "1px solid #444",
            borderRadius: "12px"
          }}
        >
          <strong>One-time setup for notifications:</strong>
          <ol>
            <li>Tap the Share icon in Safari</li>
            <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
            <li>Open Rembr from your home screen, then enable notifications</li>
          </ol>
        </div>
      )}

      {isStandalone && <p>✅ Running as an installed app — push is available.</p>}
    </main>
  );
}
