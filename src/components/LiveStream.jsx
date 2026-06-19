import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";

const LiveStream = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 50) + 15);
  const [comments, setComments] = useState([
    { username: "sofia_12", text: "¡Hola a todos! 👋" },
    { username: "carlos.dev", text: "Iniciando el live 🚀" }
  ]);
  const [streamActive, setStreamActive] = useState(true);
  const [hasCamera, setHasCamera] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const viewerNames = [
    "alex_poptok", "lucia_m", "pablo_r", "mariana99", "diego_chef",
    "gaby_manga", "enzo_football", "valentina_travel", "fer_music",
    "dani_gamer", "andrea_art", "matias_fit", "camila_vlogs", "santi_crypto"
  ];

  const randomComments = [
    "¡Hola creador! Qué buen live 🎉",
    "¿Desde dónde transmites? 🌍",
    "¡Wow, genial! 😍",
    "Poptok es lo máximo 🚀",
    "Mándame un saludo porfa! 👋",
    "Me encanta tu contenido",
    "¡Sigue así! 👏",
    "¿Qué cámara usas?",
    "¿Vas a hacer esto más seguido? 👀",
    "Mandando monedas virtuales! 🪙",
    "Jajaja qué gracioso!",
    "Increíble el live hoy 💎",
    "¡Saludos desde México! 🇲🇽",
    "¡Qué buena vibra!"
  ];

  // Request user camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setHasCamera(true);
        }
      } catch (err) {
        console.warn("Camera not accessible, falling back to mockup graphics:", err);
        setHasCamera(false);
      }
    };

    startCamera();

    return () => {
      // Stop webcam on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Simulate viewers count fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers((v) => Math.max(5, v + (Math.random() > 0.5 ? 1 : -1)));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Simulate active comments thread
  useEffect(() => {
    const interval = setInterval(() => {
      const randomName = viewerNames[Math.floor(Math.random() * viewerNames.length)];
      const randomText = randomComments[Math.floor(Math.random() * randomComments.length)];
      setComments((c) => [...c.slice(-15), { username: randomName, text: randomText }]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleEndLive = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setStreamActive(false);
    navigate("/");
  };

  const addHeart = () => {
    setFloatingHearts((prev) => [
      ...prev,
      { id: Date.now(), x: Math.random() * 60 + 20 }
    ]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.slice(1));
    }, 1200);
  };

  return (
    <div style={{
      width: "100%",
      height: "100vh",
      background: "black",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Video stream viewport */}
      {hasCamera ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
      ) : (
        <div style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "radial-gradient(circle, #330c22 0%, #000000 100%)",
          color: "white"
        }}>
          <div className="pulsing-logo" style={{
            width: "100px",
            height: "100px",
            background: "#FF0050",
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "24px",
            fontWeight: "bold",
            boxShadow: "0 0 20px #FF0050",
            marginBottom: "15px"
          }}>
            P
          </div>
          <p style={{ color: "#aaa", fontSize: "14px" }}>Transmitiendo sin video...</p>
        </div>
      )}

      {/* Top HUD */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        right: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10
      }}>
        {/* Live Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: "#FF0050",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            letterSpacing: "1px"
          }}>
            🔴 LIVE
          </span>
          <span style={{
            background: "rgba(0,0,0,0.6)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px"
          }}>
            👥 {viewers}
          </span>
        </div>

        {/* End Live Button */}
        <button
          onClick={handleEndLive}
          style={{
            background: "#FF0050",
            color: "white",
            border: "none",
            borderRadius: "20px",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 0 10px rgba(255,0,80,0.5)"
          }}
        >
          Finalizar
        </button>
      </div>

      {/* Comments Thread Overlay (Bottom Left) */}
      <div style={{
        position: "absolute",
        bottom: "90px",
        left: "20px",
        width: "80%",
        maxWidth: "350px",
        height: "220px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "end",
        gap: "6px",
        overflowY: "hidden",
        zIndex: 10,
        pointerEvents: "none",
        maskImage: "linear-gradient(to top, black 80%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 80%, transparent 100%)"
      }}>
        {comments.map((comment, index) => (
          <div key={index} style={{
            background: "rgba(0,0,0,0.45)",
            padding: "6px 12px",
            borderRadius: "15px",
            alignSelf: "flex-start",
            fontSize: "13px"
          }}>
            <span style={{ color: "#FF99B0", fontWeight: "bold", marginRight: "6px" }}>
              @{comment.username}
            </span>
            <span style={{ color: "white" }}>{comment.text}</span>
          </div>
        ))}
      </div>

      {/* Floating Hearts HUD (Bottom Right) */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 10
      }}>
        <button
          onClick={addHeart}
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "#FF0050",
            border: "none",
            color: "white",
            fontSize: "24px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: "0 0 15px rgba(255,0,80,0.6)"
          }}
        >
          ❤️
        </button>

        {/* Floating Heart Elements */}
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            style={{
              position: "absolute",
              bottom: "60px",
              left: `${heart.x}px`,
              fontSize: "24px",
              color: "#FF0050",
              animation: "floatUp 1.2s ease-out forwards",
              pointerEvents: "none"
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Embedded Floating Hearts Style */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(0.6) rotate(15deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LiveStream;
