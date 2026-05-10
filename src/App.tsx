import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import Home from "@/pages/Home";
import "./index.css";

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.warn("SW registration failed:", err));
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Home />
      <Toaster />
    </div>
  );
}

export default App;
