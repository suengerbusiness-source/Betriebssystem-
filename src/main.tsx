import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { PWAProvider } from "@/context/PWAContext";
import { PWAToast } from "@/components/PWAToast";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <PWAProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
            <PWAToast />
          </BrowserRouter>
        </AuthProvider>
      </PWAProvider>
    </ThemeProvider>
  </StrictMode>,
);
