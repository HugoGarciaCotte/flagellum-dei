import { createRoot } from "react-dom/client";
// ST-05 (§5.6): purge poisoned SW REST caches BEFORE React mounts.
import "./lib/swCachePurge";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
