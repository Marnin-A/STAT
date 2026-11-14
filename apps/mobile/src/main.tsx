import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ApiProvider } from "./api/ApiProvider.tsx";
import { DemoProvider } from "./demo/DemoProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoProvider enabled={!import.meta.env.VITE_API_URL}>
      <ApiProvider>
        <App />
      </ApiProvider>
    </DemoProvider>
  </StrictMode>,
);
