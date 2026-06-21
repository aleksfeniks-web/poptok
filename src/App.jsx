import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithCredential } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("v") ? "feed" : "explore";
  }); // "explore", "feed", "profile"
  const [activeExploreVideoId, setActiveExploreVideoId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("v") || null;
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState(() => {
    return !localStorage.getItem("poptok_privacy_accepted");
  });
  const [chatFriendId, setChatFriendId] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);
  const [reactionComment, setReactionComment] = useState(null);

  // ✅ 1. Escuchar monedas del usuario en tiempo real desde Firestore
  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      const currentUser = auth.currentUser;
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCoins(data.coins || 0);

        // Self-heal: If user document exists but is missing name/email/profilePic, update it in Firestore
        if (currentUser && (!data.name || !data.email || (currentUser.photoURL && data.profilePic !== currentUser.photoURL))) {
          try {
            await updateDoc(userRef, {
              name: data.name || currentUser.displayName || currentUser.email?.split("@")[0] || "Usuario de Poptok",
              email: data.email || currentUser.email || "",
              profilePic: data.profilePic || currentUser.photoURL || ""
            });
          } catch (e) {
            console.error("Error updating user details in Firestore:", e);
          }
        }
        
        // Si el usuario existe pero no tiene coinCounts, migrar monedas actuales a coin_1
        if (data.coins !== undefined && !data.coinCounts) {
          try {
            await updateDoc(userRef, {
              coinCounts: {
                coin_1: data.coins || 0,
                coin_2: 0,
                coin_3: 0,
                coin_4: 0,
                coin_5: 0,
                coin_6: 0
              }
            });
          } catch (error) {
            console.error("Error al migrar monedas del usuario:", error);
          }
        }
      } else {
        try {
          await setDoc(userRef, {
            name: currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuario de Poptok",
            email: currentUser?.email || "",
            profilePic: currentUser?.photoURL || "",
            coins: 0,
            coinCounts: {
              coin_1: 0,
              coin_2: 0,
              coin_3: 0,
              coin_4: 0,
              coin_5: 0,
              coin_6: 0
            },
            highScore: 0,
            createdAt: new Date().toISOString()
          }, { merge: true });
          setCoins(0);
        } catch (error) {
          console.error("Error al inicializar monedas de bienvenida:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [uid]);

  // ✅ Reproducir sonido de pop al iniciar
  const playPop = () => {
    const audio = new Audio("/pop.mp3");
    audio.play().catch(() => {
      // Fallback programático con Web Audio API si el archivo no existe o está bloqueado
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        const now = audioCtx.currentTime;
        
        // Frecuencia rápida de 600Hz a 150Hz en 120ms (sonido de pop de burbuja)
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
        
        // Decaimiento rápido del volumen
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {
        console.warn("Web Audio API bloqueado o no soportado:", e);
      }
    });
  };

  // ✅ Simular un tiempo de carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      playPop();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Toggle body scroll class based on active view
  useEffect(() => {
    const isScrollable = activeView === "explore" || activeView === "profile" || activeView === "shop";
    if (isScrollable) {
      document.body.classList.add("scrollable-view");
    } else {
      document.body.classList.remove("scrollable-view");
    }
    // Reset video playing state when switching views
    if (activeView !== "feed") {
      setIsVideoPlaying(false);
    }
    return () => {};
  }, [activeView]);

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

  // ✅ Soporte para Google Sign-In Nativo desde Android
  useEffect(() => {
    window.__poptokAndroidGoogleCallback = async (idToken, email, displayName, photoUrl) => {
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        console.log("Usuario autenticado en Android vía Google:", result.user);
        setShowAuthSelection(false);
      } catch (error) {
        console.error("Error al autenticar con credencial de Google nativa:", error);
        alert("Error al iniciar sesión con Google (Android): " + error.message);
      }
    };

    window.__poptokAndroidGoogleError = (statusCode) => {
      console.error("Error nativo de Google Sign-In, código:", statusCode);
      alert("Error en Google Sign-In de Android: " + statusCode);
    };

    return () => {
      delete window.__poptokAndroidGoogleCallback;
      delete window.__poptokAndroidGoogleError;
    };
  }, []);

  // ✅ Verificar mensajes no leídos en tiempo real y mostrar notificaciones flotantes
  useEffect(() => {
    if (!uid) return;

    try {
      const messagesRef = collection(db, "messages");
      const q = query(messagesRef, where("receiverId", "==", uid), where("read", "==", false));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadMessages(snapshot.docs.length > 0);
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate().getTime() : new Date(msg.timestamp).getTime();
            const isRecent = Date.now() - msgTime < 10000; // Recibido en los últimos 10 segundos
            
            if (isRecent) {
              const fetchSenderAndShowToast = async () => {
                try {
                  const userRef = doc(db, "users", msg.senderId);
                  const userSnap = await getDoc(userRef);
                  const senderName = userSnap.exists()
                    ? (userSnap.data().name || userSnap.data().email?.split("@")[0] || "Alguien")
                    : "Alguien";
                  
                  setToastNotification({
                    senderName,
                    text: msg.text,
                    senderId: msg.senderId
                  });
                } catch (e) {
                  console.error("Error showing toast:", e);
                }
              };
              fetchSenderAndShowToast();
            }
          }
        });
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up Firestore messages listener:", error);
    }
  }, [uid, showChat, chatFriendId]);

  // Auto-hide top toast notification
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

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
    // Si estamos en la app Android, usar Google Sign-In nativo
    if (window.PoptokAndroid && typeof window.PoptokAndroid.triggerGoogleSignIn === "function") {
      window.PoptokAndroid.triggerGoogleSignIn();
      return;
    }
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
      <div className="loading-screen">
        <img
          src="/logopoptok.png"
          alt="Poptok"
          className="loading-logo-img"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <h2 className="loading-logo-text">Poptok</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        {/* Top Floating Toast Notification */}
        {toastNotification && (!showChat || chatFriendId !== toastNotification.senderId) && (
          <div
            className="top-toast-notification"
            onClick={() => {
              setChatFriendId(toastNotification.senderId);
              setShowChat(true);
              setToastNotification(null);
            }}
          >
            <div className="toast-icon">💬</div>
            <div className="toast-body">
              <span className="toast-sender">@{toastNotification.senderName}</span>
              <span className="toast-text">{toastNotification.text}</span>
            </div>
          </div>
        )}
        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} coins={coins} setCoins={setCoins} />

        {/* Top Header */}
        <div className={`top-buttons${isVideoPlaying && activeView === "feed" ? " header-video-playing" : ""}`}>
          <h1 className="app-logo">Poptok</h1>
          <div className="header-actions">
            {user ? (
              <button
                className="header-account-btn"
                onClick={handleGoToProfile}
                title={user.displayName || user.email}
              >
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email.split("@")[0] || "U")}&background=ff0050&color=fff&bold=true`} 
                  alt="avatar" 
                  className="header-avatar" 
                />
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
              Pa' Ti
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
                  onVideoPlayStateChange={setIsVideoPlaying}
                  onReactToComment={(cmt) => {
                    setReactionComment(cmt);
                    setShowUploadSection(true);
                  }}
                />
              )}
            </>
          } />
          <Route path="/countdown/:roomId" element={<LiveCountdown />} />
          <Route path="/live/:roomId" element={<LiveStream />} />
        </Routes>


        {/* Upload Modal — the component renders its own overlay */}
        {showUploadSection && (
          <UploadVideo 
            onUploadSuccess={handleUploadSuccess} 
            setPage={setPage} 
            reactionComment={reactionComment}
            clearReaction={() => setReactionComment(null)}
          />
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
            style={{ 
              color: activeView === "profile" ? "#FF0050" : undefined,
              padding: user ? "0" : undefined,
              overflow: user ? "hidden" : undefined,
              borderRadius: user ? "50%" : undefined,
              width: user ? "32px" : undefined,
              height: user ? "32px" : undefined,
              border: activeView === "profile" && user ? "2px solid #FF0050" : undefined,
            }}
          >
            {user ? (
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email.split("@")[0] || "U")}&background=ff0050&color=fff&bold=true`}
                alt="Perfil"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              <BsFillPersonFill size={22} />
            )}
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

        {/* Modal de Aceptación de Política de Privacidad */}
        {showPrivacyModal && (
          <div className="privacy-accept-overlay" style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.95)",
            backdropFilter: "blur(10px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            <div className="privacy-accept-card" style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "24px",
              padding: "30px",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}>
              <div style={{ fontSize: "50px" }}>🛡️</div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>
                Política de Privacidad
              </h2>
              <p style={{ fontSize: "14px", color: "#ccc", lineHeight: "1.6", margin: 0 }}>
                Para continuar disfrutando de <strong>Poptok</strong>, por favor lee y acepta nuestra política de privacidad. Respetamos tus datos y protegemos tu información.
              </p>
              <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "15px",
                maxHeight: "150px",
                overflowY: "auto",
                fontSize: "12px",
                color: "#aaa",
                textAlign: "left",
                lineHeight: "1.5"
              }}>
                <h4 style={{ color: "#fff", marginTop: 0, marginBottom: "5px" }}>1. Información que recopilamos</h4>
                <p style={{ marginTop: 0 }}>Recopilamos información de tu perfil como nombre, correo electrónico y estadísticas de uso de gemas para personalizar tu experiencia.</p>
                <h4 style={{ color: "#fff", marginBottom: "5px" }}>2. Uso de Cámara y Micrófono</h4>
                <p style={{ marginTop: 0 }}>Los permisos de cámara y micrófono son solicitados únicamente al iniciar transmisiones en vivo o al grabar videos para subir.</p>
                <h4 style={{ color: "#fff", marginBottom: "5px" }}>3. Protección de Datos</h4>
                <p style={{ marginTop: 0 }}>Tus datos están protegidos en nuestros servidores de Firebase y no son compartidos con terceros.</p>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem("poptok_privacy_accepted", "true");
                  setShowPrivacyModal(false);
                }}
                style={{
                  background: "linear-gradient(135deg, #ff0050, #ff00ff)",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(255, 0, 80, 0.4)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.transform = "scale(1.03)"}
                onMouseOut={(e) => e.target.style.transform = "scale(1)"}
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
