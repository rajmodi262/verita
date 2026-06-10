import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Studio from "./pages/Studio";
import Risk from "./pages/Risk";
import NLP from "./pages/NLP";
import Placeholder from "./pages/Placeholder";

export default function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppShell />}>
          <Route path="/studio" element={<Studio />} />
          <Route path="/overview" element={<Placeholder title="Overview" />} />
          <Route path="/risk" element={<Risk />} />
          <Route path="/nlp" element={<NLP />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
