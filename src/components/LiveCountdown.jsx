import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const LiveCountdown = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (seconds <= 0) {
      navigate(`/live/${roomId}`);
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds, roomId, navigate]);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      background: "radial-gradient(circle, #220011 0%, #000000 100%)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "white",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 1000
    }}>
      <h2 style={{ fontSize: "20px", fontWeight: "300", letterSpacing: "2px", textTransform: "uppercase", color: "#aaa" }}>
        Preparando Live...
      </h2>
      <div style={{
        fontSize: "120px",
        fontWeight: "900",
        margin: "20px 0",
        color: "#FF0050",
        textShadow: "0 0 20px #FF0050, 0 0 40px #FF0050",
        animation: "pulse 1s infinite"
      }}>
        {seconds}
      </div>
      <p style={{ color: "#888", fontSize: "14px" }}>Cargando filtros y audio...</p>
    </div>
  );
};

export default LiveCountdown;
