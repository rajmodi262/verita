import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Studio from "./pages/Studio";
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
          <Route path="/risk" element={<Placeholder title="Risk & Anomaly Engine" note="Real scikit-learn fraud scoring with ROC-AUC, precision-recall, threshold tuning and an AML alert queue. Building this next." />} />
          <Route path="/nlp" element={<Placeholder title="NLP Insight" note="Ask your data in plain English and get the right chart back. Coming after the Risk Engine." />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
