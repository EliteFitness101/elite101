import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>,
  );
}
