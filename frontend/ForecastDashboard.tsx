import React, { useState } from "react";

export const ForecastDashboard: React.FC = () => {
  const [forecastHash, setForecastHash] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forecastHash) return;
    setStatus("Submitting forecast to blockchain...");
    
    // Integration point with forecastRegistryService
    setTimeout(() => {
      setStatus("Forecast successfully registered!");
    }, 1500);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", color: "#fff", backgroundColor: "#1e1e1e", borderRadius: "8px" }}>
      <h2>Forecast Registry Dashboard</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: "15px" }}>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Forecast Hash:</label>
          <input
            type="text"
            value={forecastHash}
            onChange={(e) => setForecastHash(e.target.value)}
            placeholder="0x..."
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #444",
              backgroundColor: "#2d2d2d",
              color: "#fff"
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            backgroundColor: "#0e639c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Submit Forecast
        </button>
      </form>
      {status && <p style={{ marginTop: "15px", fontWeight: "bold", color: "#4ec9b0" }}>{status}</p>}
    </div>
  );
};