import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { PWAProvider } from "@/context/PWAContext";
import { ModeProvider } from "@/context/ModeContext";
import { PWAToast } from "@/components/PWAToast";
import "@fontsource-variable/inter";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PWAProvider>
        <AuthProvider>
          <ModeProvider>
            {/* basename = Vite-Base, damit Routing auch unter /betriebssystem-/ läuft */}
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
              <App />
              <PWAToast />
            </BrowserRouter>
          </ModeProvider>
        </AuthProvider>
      </PWAProvider>
    </ThemeProvider>
  </StrictMode>,
);
