import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./pages/Landing";
import Studio from "./pages/Studio";
import Risk from "./pages/Risk";
import NLP from "./pages/NLP";
import Overview from "./pages/Overview";
import Settings from "./pages/Settings";

const wrap = (label: string, node: React.ReactNode) => (
  <ErrorBoundary label={label}>{node}</ErrorBoundary>
);

// Disable the app-shell cursor on / — landing page manages its own scroll effects
function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <>
      {pathname !== '/' && <CustomCursor />}
      <Routes>
        <Route path="/" element={wrap("Landing", <Landing />)} />
        <Route element={<AppShell />}>
          <Route path="/studio" element={wrap("Studio", <Studio />)} />
          <Route path="/overview" element={wrap("Overview", <Overview />)} />
          <Route path="/risk" element={wrap("Risk Engine", <Risk />)} />
          <Route path="/nlp" element={wrap("NLP Insight", <NLP />)} />
          <Route path="/settings" element={wrap("Settings", <Settings />)} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
