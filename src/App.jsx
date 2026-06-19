import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";

import Sidebar from "./components/Sidebar.jsx";
import Chat from "./components/Chat.jsx";
import Feed from "./components/Feed.jsx";
import UploadVideo from "./components/UploadVideo.jsx";
import LiveCountdown from "./components/LiveCountdown.jsx";
import LiveStream from "./components/LiveStream.jsx";
import Profile from "./components/Profile.jsx";
import Shop from "./components/Shop.jsx";

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
  const [activeView, setActiveView] = useState("explore"); // "explore", "feed", "profile"
  const [activeExploreVideoId, setActiveExploreVideoId] = useState(null);
  const [chatFriendId, setChatFriendId] = useState(null);

  // ✅ 1. Escuchar monedas del usuario en tiempo real desde Firestore
  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        setCoins(snapshot.data().coins || 0);
      } else {
        try {
          await setDoc(userRef, {
            coins: 10,
            highScore: 0,
            createdAt: new Date().toISOString()
          }, { merge: true });
          setCoins(10);
        } catch (error) {
          console.error("Error al inicializar monedas de bienvenida:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [uid]);

  // ✅ Simular un tiempo de carga inicial
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ 2. Manejar autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setUid(u.uid);
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
    setChatFriendId(null);
  };

  const handleContactSeller = (sellerId) => {
    if (!user) {
      alert("⚠ Inicia sesión para chatear con el vendedor.");
      setShowAuthSelection(true);
      return;
    }
    setChatFriendId(sellerId);
    setShowChat(true);
  };

  const handleGoToFeed = () => {
    setPage(1); 
    setShowUploadSection(false); 
    setShowChat(false); 
    setActiveView("explore");
    setActiveExploreVideoId(null);
  };

  const handleGoToProfile = () => {
    if (!user) {
      alert("⚠ Debes iniciar sesión para ver tu perfil.");
      setShowAuthSelection(true);
      return;
    }
    setActiveView("profile");
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

  // ✅ Iniciar sesión con Google
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Usuario autenticado con Google:", result.user);
      setShowAuthSelection(false); 
    } catch (error) {
      console.error("Error en Google Sign-In:", error.message);
      alert("Error al iniciar sesión con Google: " + error.message);
    }
  };

  // ✅ Iniciar sesión con Apple
  const handleAppleSignIn = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      console.log("Usuario autenticado con Apple:", result.user);
      setShowAuthSelection(false); 
    } catch (error) {
      console.error("Error en Apple Sign-In:", error.message);
      alert("Error al iniciar sesión con Apple: " + error.message);
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
          <h1 className="app-logo">Poptok</h1>
          <div className="header-actions">
            {user ? (
              <button
                className="header-account-btn"
                onClick={handleGoToProfile}
                title={user.displayName || user.email}
              >
                {user.photoURL
                  ? <img src={user.photoURL} alt="avatar" className="header-avatar" />
                  : <BsFillPersonFill size={20} />}
              </button>
            ) : (
              <button
                className="header-signin-btn"
                onClick={() => setShowAuthSelection(true)}
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>

        {/* Toggle layout bar: only when in home/feed/explore views */}
        {(activeView === "feed" || activeView === "explore") && (
          <div className="layout-toggle-bar">
            <button 
              className={`toggle-button ${activeView === "explore" ? "active" : ""}`}
              onClick={() => {
                setActiveView("explore");
                setActiveExploreVideoId(null);
              }}
            >
              Explorar
            </button>
            <button 
              className={`toggle-button ${activeView === "feed" ? "active" : ""}`}
              onClick={() => setActiveView("feed")}
            >
              Para Ti
            </button>
          </div>
        )}

        {/* Main Routes */}
        <Routes>
          <Route path="/" element={
            <>
              {activeView === "profile" ? (
                <Profile />
              ) : activeView === "shop" ? (
                <Shop onContactSeller={handleContactSeller} />
              ) : (
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
                  layout={activeView}
                  onSelectExploreVideo={(videoId) => {
                    setActiveExploreVideoId(videoId);
                    setActiveView("feed");
                  }}
                  activeExploreVideoId={activeExploreVideoId}
                  setActiveExploreVideoId={setActiveExploreVideoId}
                />
              )}
            </>
          } />
          <Route path="/countdown/:roomId" element={<LiveCountdown />} />
          <Route path="/live/:roomId" element={<LiveStream />} />
        </Routes>


        {/* Upload Modal — the component renders its own overlay */}
        {showUploadSection && (
          <UploadVideo onUploadSuccess={handleUploadSuccess} setPage={setPage} />
        )}


        {/* Chat Overlay */}
        {showChat && (
          <Chat
            closeChat={handleCloseChat}
            coinBalance={coins}
            sendCoin={() => setCoins((prev) => Math.max(0, prev - 1))}
            unreadMessages={unreadMessages}
            setUnreadMessages={setUnreadMessages}
            initialFriend={chatFriendId}
          />
        )}

        {/* Bottom Bar Navigation */}
        <div className="bottom-bar">
          {/* Home */}
          <button
            className="home-button"
            onClick={handleGoToFeed}
            style={{ color: (activeView === "explore" || activeView === "feed") ? "#FF0050" : undefined }}
          >
            <FiHome size={22} />
          </button>

          {/* Shop */}
          <button
            className="shop-button"
            onClick={() => {
              setActiveView("shop");
              setShowUploadSection(false);
              setShowChat(false);
            }}
            style={{ color: activeView === "shop" ? "#FF0050" : undefined }}
          >
            <FiShoppingCart size={22} />
          </button>

          {/* Upload */}
          <button className="add-button" onClick={handleUploadClick}>+</button>

          {/* Chat / Inbox */}
          <button className="inbox-button" onClick={handleOpenChat} style={{ position: "relative" }}>
            <FiCoffee size={22} color={unreadMessages ? "#FF0050" : undefined} />
            {unreadMessages && (
              <span style={{
                position: "absolute", top: "8px", right: "8px",
                background: "#FF0050", borderRadius: "50%", width: "7px", height: "7px",
                display: "block"
              }} />
            )}
          </button>

          {/* Profile */}
          <button
            className="profile-button"
            onClick={handleGoToProfile}
            style={{ color: activeView === "profile" ? "#FF0050" : undefined }}
          >
            <BsFillPersonFill size={22} />
          </button>
        </div>


        {/* Auth Modal - shown when auth selection or sign-up form is active */}
        {(showAuthSelection || isSignUp) && !user && (
          <div className="auth-modal-overlay" onClick={(e) => { if (e.target.classList.contains('auth-modal-overlay')) { setShowAuthSelection(false); setIsSignUp(false); } }}>
            <div className="auth-modal">
              {/* Logo / Brand */}
              <div className="auth-modal-brand">
                <span className="auth-modal-logo">Poptok</span>
                <p className="auth-modal-tagline">Crea, comparte y conecta</p>
              </div>

              {/* Social Sign-In Buttons */}
              <div className="auth-social-buttons">
                <button id="btn-google-signin" className="auth-social-btn auth-google-btn" onClick={handleGoogleSignIn}>
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M47.532 24.5528C47.532 22.9214 47.3997 21.2811 47.1175 19.6761H24.48V28.9181H37.4434C36.9055 31.8988 35.177 34.5356 32.6461 36.2111V42.2078H40.3801C44.9217 38.0278 47.532 31.8547 47.532 24.5528Z" fill="#4285F4"/>
                    <path d="M24.48 48.0016C30.9529 48.0016 36.4116 45.8764 40.3888 42.2078L32.6549 36.2111C30.5031 37.675 27.7252 38.5039 24.4888 38.5039C18.2275 38.5039 12.9187 34.2798 11.0139 28.6006H3.03296V34.7825C7.10718 42.8868 15.4056 48.0016 24.48 48.0016Z" fill="#34A853"/>
                    <path d="M11.0051 28.6006C9.99973 25.6199 9.99973 22.3922 11.0051 19.4115V13.2296H3.03298C-0.371021 20.0112 -0.371021 28.0009 3.03298 34.7825L11.0051 28.6006Z" fill="#FBBC04"/>
                    <path d="M24.48 9.49932C27.9016 9.44641 31.2086 10.7339 33.6866 13.0973L40.5387 6.24523C36.2 2.17101 30.4414 -0.068932 24.48 0.00161733C15.4055 0.00161733 7.10718 5.11644 3.03296 13.2296L11.005 19.4115C12.901 13.7235 18.2187 9.49932 24.48 9.49932Z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>

                <button id="btn-apple-signin" className="auth-social-btn auth-apple-btn" onClick={handleAppleSignIn}>
                  <svg width="20" height="20" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.7C46.8 718.2 0 611.3 0 509.1 0 315 130.3 209.4 258.6 209.4c70.2 0 128.7 44.8 172.2 44.8 40.3 0 103.9-47.6 181.8-47.6zm-113.6-142.4c30.2-36.3 51.4-87.5 51.4-138.6 0-7.1-.6-14.3-1.9-20.1-48.7 1.9-106.9 32.3-141.8 73.3-27.3 31.6-51.4 82.8-51.4 134.6 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 43.5 0 98.9-28.5 128.2-68.6z"/>
                  </svg>
                  Continuar con Apple
                </button>
              </div>

              {/* Divider */}
              <div className="auth-divider">
                <span>o</span>
              </div>

              {/* Email / Password Form */}
              {isSignUp ? (
                <form onSubmit={handleSignUp} className="auth-email-form">
                  <input
                    id="auth-username"
                    type="text"
                    placeholder="Nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Contraseña (mín. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <button id="btn-email-signup" type="submit" className="auth-email-btn">
                    Crear Cuenta
                  </button>
                  <p className="auth-switch-link">
                    ¿Ya tienes cuenta?{" "}
                    <span onClick={() => setIsSignUp(false)}>Inicia Sesión</span>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="auth-email-form">
                  <input
                    id="auth-login-email"
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <input
                    id="auth-login-password"
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input"
                    required
                  />
                  <button id="btn-email-login" type="submit" className="auth-email-btn">
                    Iniciar Sesión
                  </button>
                  <p className="auth-switch-link">
                    ¿No tienes cuenta?{" "}
                    <span onClick={() => setIsSignUp(true)}>Regístrate</span>
                  </p>
                </form>
              )}

              {/* Guest option */}
              {showAuthSelection && (
                <button
                  id="btn-guest-continue"
                  className="auth-guest-btn"
                  onClick={() => { setShowAuthSelection(false); setIsSignUp(false); }}
                >
                  Continuar como Invitado
                </button>
              )}

              {/* Sign up / Login toggle when showing selection */}
              {showAuthSelection && !isSignUp && (
                <p className="auth-switch-link" style={{ marginTop: "12px" }}>
                  ¿No tienes cuenta?{" "}
                  <span onClick={() => setIsSignUp(true)}>Regístrate</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
