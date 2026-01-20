import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { EnvErrorBoundary } from "./components/EnvErrorBoundary.tsx";
import "./index.css";

// Initialize app with proper error boundaries
const rootElement = document.getElementById("root");

if (!rootElement) {
  // Fallback for missing root element (should never happen in normal circumstances)
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a1a;color:#fff;font-family:system-ui;">
      <div style="text-align:center;padding:2rem;">
        <h1 style="font-size:1.5rem;margin-bottom:1rem;">Erro de Inicialização</h1>
        <p style="color:#888;">Elemento root não encontrado. Recarregue a página.</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:#e50914;color:#fff;border:none;border-radius:0.5rem;cursor:pointer;">
          Recarregar
        </button>
      </div>
    </div>
  `;
} else {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <EnvErrorBoundary>
        <App />
      </EnvErrorBoundary>
    </ErrorBoundary>
  );
}
