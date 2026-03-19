import { useState, useEffect } from "react";

export default function App() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTSTiGPTj3d8JIUglnoc9_h25XJWa1u-5umMUkXXIMvipwZZA8h9VWCQIx7nN_JDFjzmvB_r2OKqsEq/pub?gid=0&single=true&output=csv")
      .then(r => r.text())
      .then(t => setStatus("CSV loaded! First 200 chars: " + t.slice(0, 200)))
      .catch(e => setStatus("Error: " + e.message));
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Stokeshire Analytics Test</h1>
      <p>{status}</p>
    </div>
  );
}
