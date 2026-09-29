import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import config from "../granite.config.ts";
import App from "./App.tsx";
import { AppsInTossAuthProvider } from "./auth/AppsInTossAuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
      <AppsInTossAuthProvider>
        <App />
      </AppsInTossAuthProvider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
