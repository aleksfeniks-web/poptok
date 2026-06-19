import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase.js";

import Sidebar from "./components/Sidebar.jsx";
import Chat from "./components/Chat.jsx";
import Feed from "./components/Feed.jsx";
import UploadVideo from "./components/UploadVideo.jsx";
import LiveCountdown from "./components/LiveCountdown.jsx";
import LiveStream from "./components/LiveStream.jsx";

import { FiCoffee, FiHome, FiShoppingCart } from "react-icons/fi";
import { BsFillPersonFill } from "react-icons/bs";
import "./index.css";

function App() {
  const [loading, setLoading] = useState(true);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [coins, setCoins] = useState(0);
  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null); 
  const [showAuthSelection, setShowAuthSelection] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [page, setPage] = useState(1); 
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(false); 
  const [roomId, setRoomId] = useState(null);

  // ✅ 1. Obtener monedas del usuario desde DynamoDB al iniciar sesión
  const fetchUserCoins = async (userUid) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://www.kibimex.com";
      const response = await fetch(`${apiUrl}/GetUserCoins?uid=${userUid}`);
      if (!response.ok) throw new Error("Error al obtener monedas");
      
      const data = await response.json();
      console.log("🔄 Monedas obtenidas:", data.coins);
      setCoins(data.coins || 0); 
    } catch (error) {
      console.error("Error al obtener monedas:", error);
    }
  };

  // ✅ Simular un tiempo de carga inicial
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 2. Manejar autenticación y obtener monedas
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setUid(u.uid);
        fetchUserCoins(u.uid); 
      } else {
        setUser(null);
        setUid(null);
        setCoins(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Verificar mensajes no leídos en tiempo real
  useEffect(() => {
    if (!uid) return;

    try {
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("receiverId", "==", uid), where("read", "==", false));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadMessages(snapshot.docs.length > 0);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up Firestore messages listener:", error);
    }
  }, [uid]);

  // ✅ Mostrar ventana de selección de autenticación después de 5 minutos si no está autenticado
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setShowAuthSelection(true); 
      }, 300000); // 5 minutos
      return () => clearTimeout(timer);
    }
  }, [user]);

  // ✅ Iniciar Live Stream con ID único y cuenta regresiva
  const startLiveStream = () => {
    if (!user) {
      alert("⚠ Debes iniciar sesión para comenzar un Live.");
      setShowAuthSelection(true);
      return;
    }
    const newRoomId = Math.random().toString(36).substring(7); 
    setRoomId(newRoomId);
    window.location.href = `/countdown/${newRoomId}`;
  };

  const handleOpenChat = () => {
    if (!user) {
      alert("⚠ Debes iniciar sesión para chatear.");
      setShowAuthSelection(true);
      return;
    }
    setShowChat(true);
    setUnreadMessages(false);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  const handleGoToFeed = () => {
    setPage(1); 
    setShowUploadSection(false); 
    setShowChat(false); 
  };

  // ✅ Manejar inicio de sesión con correo/contraseña
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Usuario autenticado:", userCredential.user);
      setShowAuthSelection(false); 
    } catch (error) {
      console.error("Error de autenticación:", error.message);
      alert("Error al iniciar sesión: " + error.message);
    }
  };

  // ✅ Manejar registro con correo/contraseña
  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      console.log("Usuario registrado:", userCredential.user);
      setShowAuthSelection(false); 
    } catch (error) {
      console.error("Error de registro:", error.message);
      alert("Error al registrarse: " + error.message);
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      alert("⚠ Debes iniciar sesión para subir contenido.");
      setShowAuthSelection(true); 
      return;
    }
    setShowUploadSection(true);
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setShowUploadSection(false);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#000" }}>
        <img
          src="https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/ki.gif"
          alt="Cargando Poptok..."
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h2 style={{ color: "#FF0050", fontSize: "24px", position: "absolute", textShadow: "0 0 10px #FF0050" }}>Poptok</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} coins={coins} setCoins={setCoins} />

        {/* Top Header */}
        <div className="top-buttons">
          <h1>Poptok</h1>
          <div className="buttons">
            <button className="add-button" onClick={startLiveStream} style={{ background: "#FF0050", border: "none", color: "white", borderRadius: "15px", padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}>
              🔴 Live
            </button>
          </div>
        </div>

        {/* Main Routes */}
        <Routes>
          <Route path="/" element={
            <div className="feed-container">
              <Feed
                user={user}
                coins={coins}
                setCoins={setCoins}
                showUploadSection={showUploadSection}
                setShowUploadSection={setShowUploadSection}
                refreshTrigger={refreshTrigger} 
                setPage={setPage}
                page={page}
                isOpen={isSidebarOpen || showChat || showUploadSection}
              />
            </div>
          } />
          <Route path="/countdown/:roomId" element={<LiveCountdown />} />
          <Route path="/live/:roomId" element={<LiveStream />} />
        </Routes>

        {/* Upload Overlay */}
        {showUploadSection && (
          <>
            <button className="close-button" onClick={() => setShowUploadSection(false)}>✖</button>
            <div className="upload-section">
              <UploadVideo onUploadSuccess={handleUploadSuccess} setPage={setPage} />
            </div>
          </>
        )}

        {/* Chat Overlay */}
        {showChat && (
          <Chat
            closeChat={handleCloseChat}
            coinBalance={coins}
            sendCoin={() => setCoins((prev) => Math.max(0, prev - 1))}
            unreadMessages={unreadMessages}
            setUnreadMessages={setUnreadMessages}
          />
        )}

        {/* Bottom Bar Navigation */}
        <div className="bottom-bar">
          <button className="home-button" onClick={handleGoToFeed} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>  
            <FiHome size={24} />
          </button>
          
          <button className="shop-button" onClick={() => alert("¡Tienda Poptok próximamente!")} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
            <FiShoppingCart size={24} />
          </button>

          <button className="add-button" onClick={handleUploadClick}>+</button>

          <button className="inbox-button" onClick={handleOpenChat} style={{ background: "none", border: "none", color: "white", cursor: "pointer", position: "relative" }}>
            <FiCoffee size={24} color={unreadMessages ? "#FF0050" : "white"} />
            {unreadMessages && <span className="notification-bubble" style={{ position: "absolute", top: "-5px", right: "-5px", background: "#FF0050", borderRadius: "50%", width: "8px", height: "8px" }} />}
          </button>

          <button className="profile-button" onClick={() => setIsSidebarOpen(true)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <BsFillPersonFill size={24} />
            <span className="coin-count" style={{ fontSize: "10px", color: "#FFBB00", marginTop: "2px" }}>
              {coins} 🪙
            </span>
          </button>
        </div>

        {/* Auth Selection Overlay */}
        {showAuthSelection && !user && (
          <div className="auth-selection-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
            <div className="auth-selection">
              <h2>Bienvenido a Poptok</h2>
              <p>Elige una opción para continuar:</p>
              <div className="auth-buttons">
                <button onClick={() => setIsSignUp(true)} style={{ background: "#FF0050", color: "white", border: "none", padding: "10px 20px", borderRadius: "20px", cursor: "pointer" }}>
                  Registrarse / Iniciar Sesión
                </button>
                <button onClick={() => setShowAuthSelection(false)} style={{ background: "#444", color: "white", border: "none", padding: "10px 20px", borderRadius: "20px", cursor: "pointer", marginLeft: "10px" }}>
                  Continuar como Invitado
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auth Form (Sign Up / Login) */}
        {isSignUp && !user && (
          <div className="auth-selection-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
            <div className="auth-selection">
              <h2>{isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}</h2>
              <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="auth-form" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ padding: "8px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }}
                  required={isSignUp}
                />
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ padding: "8px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ padding: "8px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }}
                  required
                />
                <button type="submit" style={{ padding: "10px", background: "#FF0050", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}>
                  {isSignUp ? "Registrarse" : "Iniciar Sesión"}
                </button>
                <button
                  type="button"
                  className="toggle-button"
                  style={{ background: "none", border: "none", color: "#aaa", textDecoration: "underline", fontSize: "12px", cursor: "pointer", marginTop: "10px" }}
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "¿Ya tienes una cuenta? Inicia Sesión" : "¿No tienes una cuenta? Regístrate"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
