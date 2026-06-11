import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./pages/Landing";
import Studio from "./pages/Studio";
import Risk from "./pages/Risk";
import NLP from "./pages/NLP";
import Placeholder from "./pages/Placeholder";

const wrap = (label: string, node: React.ReactNode) => <ErrorBoundary label={label}>{node}</ErrorBoundary>;

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        <Route path="/" element={wrap("Landing", <Landing />)} />
        <Route element={<AppShell />}>
          <Route path="/studio" element={wrap("Studio", <Studio />)} />
          <Route path="/overview" element={<Placeholder title="Overview" />} />
          <Route path="/risk" element={wrap("Risk Engine", <Risk />)} />
          <Route path="/nlp" element={wrap("NLP Insight", <NLP />)} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
