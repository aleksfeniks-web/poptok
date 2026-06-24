import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FiUsers, FiShoppingBag, FiX } from "react-icons/fi";
import { db, auth } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  increment, 
  runTransaction,
  getDocs
} from "firebase/firestore";

import coin1 from "../assets/coin_1.svg";
import coin2 from "../assets/coin_2.svg";
import coin3 from "../assets/coin_3.svg";
import coin4 from "../assets/coin_4.svg";
import coin5 from "../assets/coin_5.svg";
import coin6 from "../assets/coin_6.svg";

const coinImages = {
  1: coin1,
  2: coin2,
  3: coin3,
  4: coin4,
  5: coin5,
  6: coin6
};

const coinNames = {
  1: "Gema Rosa",
  2: "Gema Naranja",
  3: "Gema Verde",
  4: "Gema Púrpura",
  5: "Gema Azul",
  6: "Gema Dorada"
};

const coinColors = {
  1: "#FF69B4",
  2: "#FF8C00",
  3: "#32CD32",
  4: "#BA55D3",
  5: "#1E90FF",
  6: "#FFD700"
};

const LiveStream = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Authentication & Users
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [liveData, setLiveData] = useState(null);

  // Live Stats
  const [viewers, setViewers] = useState(0);
  const [comments, setComments] = useState([]);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [hasCamera, setHasCamera] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // "user" (front) or "environment" (back)
  const [streamActive, setStreamActive] = useState(true);

  // Inputs & Modals
  const [newComment, setNewComment] = useState("");
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [giftAnimation, setGiftAnimation] = useState(null);
  const [particles, setParticles] = useState([]);
  const [goldGems, setGoldGems] = useState([]);
  const [showStats, setShowStats] = useState(false);
  const [finalStats, setFinalStats] = useState({ likes: 0, viewers: 0, gems: 0 });

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const commentsEndRef = useRef(null);
  const prevLikesRef = useRef(0);
  const isHostRef = useRef(false);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Escuchar autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
        alert("Debes iniciar sesión para ver un Live.");
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Escuchar perfil del usuario actual (para inventario de gemas)
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Reset states when roomId changes
  useEffect(() => {
    setLiveData(null);
    setIsHost(false);
    setViewers(0);
    setComments([]);
    setFloatingHearts([]);
    setHasCamera(false);
    setStreamActive(true);
    setShowGiftsModal(false);
    setShowProductsModal(false);
    setGiftAnimation(null);
  }, [roomId]);

  // Redirección automática al finalizar el directo
  const handleAutoRedirect = async () => {
    alert("El En Vivo ha finalizado. Buscando otra transmisión activa...");
    try {
      const q = query(collection(db, "lives"), where("status", "==", "active"));
      const snap = await getDocs(q);
      const now = Date.now();
      const otherLives = snap.docs
        .map(d => d.data())
        .filter(l => {
          if (l.roomId === roomId) return false;
          // Filter out stale streams (no heartbeat within 45 seconds)
          const lastActive = l.lastHeartbeat ? new Date(l.lastHeartbeat).getTime() : new Date(l.createdAt).getTime();
          return (now - lastActive) < 45000;
        });

      if (otherLives.length > 0) {
        const nextRoomId = otherLives[0].roomId;
        navigate(`/live/${nextRoomId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Error al buscar otras transmisiones:", err);
      navigate("/");
    }
  };

  // Escuchar datos de la transmisión
  useEffect(() => {
    if (!roomId) return;
    const liveRef = doc(db, "lives", roomId);
    
    const unsubscribe = onSnapshot(liveRef, (snap) => {
      if (!snap.exists()) {
        setStreamActive(false);
        // Si somos el espectador, redirigir automáticamente
        if (currentUser && !isHostRef.current) {
          handleAutoRedirect();
        }
        return;
      }
      const data = snap.data();
      if (data.status === "ended") {
        setFinalStats({
          likes: data.likes || 0,
          viewers: data.viewersCount || 0,
          gems: data.gemsCount || 0
        });
        setStreamActive(false);
        setShowStats(true);
        return;
      }
      setLiveData(data);
      setViewers(data.viewersCount || 0);

      // Si el usuario actual es el host
      if (currentUser && data.hostId === currentUser.uid) {
        setIsHost(true);
      } else {
        setIsHost(false);
      }
    });

    return () => unsubscribe();
  }, [roomId, currentUser]);

  // Cleanup on unmount or page exit (host only)
  useEffect(() => {
    const handleUnload = () => {
      if (isHostRef.current && roomId) {
        const liveRef = doc(db, "lives", roomId);
        updateDoc(liveRef, { status: "ended" }).catch(e => console.error(e));
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (isHostRef.current && roomId) {
        const liveRef = doc(db, "lives", roomId);
        updateDoc(liveRef, { status: "ended" }).catch(e => console.error(e));
      }
    };
  }, [roomId]);

  // Host heartbeat to keep live active
  useEffect(() => {
    if (!isHost || !streamActive || !roomId) return;

    const interval = setInterval(async () => {
      try {
        const liveRef = doc(db, "lives", roomId);
        await updateDoc(liveRef, {
          lastHeartbeat: new Date().toISOString()
        });
      } catch (e) {
        console.error("Error sending heartbeat:", e);
      }
    }, 15000); // Send heartbeat every 15 seconds

    return () => clearInterval(interval);
  }, [isHost, streamActive, roomId]);

  const triggerGoldGemShower = () => {
    const list = [];
    const count = 20;
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const startX = window.innerWidth * 0.5 + (Math.random() - 0.5) * 100;
      const startY = window.innerHeight * 0.8;
      const tx = (Math.random() - 0.5) * window.innerWidth * 0.8;
      const ty = -window.innerHeight * 0.5 - Math.random() * window.innerHeight * 0.3;
      list.push({
        id: `gold-gem-${now}-${i}`,
        x: startX,
        y: startY,
        tx,
        ty,
        scale: 0.5 + Math.random() * 0.8,
        rot: Math.random() * 720 - 360,
        delay: i * 80
      });
    }
    setGoldGems(prev => [...prev, ...list]);
    setTimeout(() => {
      setGoldGems(prev => prev.filter(g => !list.find(lg => lg.id === g.id)));
    }, 4000);
  };

  const spawnParticles = (x, y) => {
    const id = Math.random() + Date.now();
    const newParticles = [];
    newParticles.push({
      id: `heart-${id}`,
      type: "heart",
      x,
      y,
      emoji: ["❤️", "💖", "💝", "💕"][Math.floor(Math.random() * 4)],
      scale: 0.8 + Math.random() * 0.5,
      angle: -20 + Math.random() * 40
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 2 * Math.PI + Math.random() * 0.4;
      const dist = 50 + Math.random() * 40;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 30;
      newParticles.push({
        id: `sparkle-${id}-${i}`,
        type: "sparkle",
        x,
        y,
        color: ["#00f2fe", "#ff007f", "#9d00ff", "#ffeb3b", "#ff5722"][Math.floor(Math.random() * 5)],
        emoji: ["✨", "⭐", "💫", "🌟"][Math.floor(Math.random() * 4)],
        tx,
        ty,
        scale: 0.5 + Math.random() * 0.8,
        angle: Math.random() * 360
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1200);
  };

  const handleScreenDoubleTap = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select") || e.target.closest("textarea")) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnParticles(x, y);
    handleLike();
  };

  const handleExitLive = () => {
    setFinalStats({
      likes: liveData?.likes || 0,
      viewers: liveData?.viewersCount || 0,
      gems: liveData?.gemsCount || 0
    });
    setShowStats(true);
  };

  // Incrementar viewersCount cuando el espectador se conecta y decrementar al salir
  useEffect(() => {
    if (!roomId || !currentUser || !liveData) return;
    // Si somos el host no contamos como espectador
    if (liveData.hostId === currentUser.uid) return;

    const liveRef = doc(db, "lives", roomId);
    
    // Incrementar en Firestore
    updateDoc(liveRef, {
      viewersCount: increment(1)
    }).catch(e => console.error("Error incrementing viewersCount:", e));

    return () => {
      // Decrementar al desconectarse
      updateDoc(liveRef, {
        viewersCount: increment(-1)
      }).catch(e => console.error("Error decrementing viewersCount:", e));
    };
  }, [roomId, currentUser, liveData === null]);

  // Escuchar comentarios en tiempo real
  useEffect(() => {
    if (!roomId) return;
    const commentsRef = collection(db, "lives", roomId, "comments");
    const q = query(commentsRef, orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Desplazar chat hacia abajo automáticamente
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Activar cámara para el anfitrión (Host)
  useEffect(() => {
    if (isHost && streamActive) {
      const startCamera = async () => {
        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }

          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("El navegador o el protocolo (se requiere HTTPS) no soportan el acceso a la cámara.");
          }

          let stream;
          try {
            // Intento 1: Video y Audio
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facingMode },
              audio: true
            });
          } catch (audioErr) {
            console.warn("Fallo al obtener audio/video combinado, intentando solo video...", audioErr);
            // Intento 2: Solo Video (muy común si falta micrófono o permiso de audio)
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facingMode },
              audio: false
            });
          }

          streamRef.current = stream;
          setHasCamera(true);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error al acceder a la cámara:", err);
          alert("Acceso a Cámara no disponible: " + err.message + "\nSe activará el simulador visual.");
          setHasCamera(false);
        }
      };
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isHost, streamActive, facingMode]);

  // Asignar el stream al videoRef cuando el elemento esté montado en el DOM
  useEffect(() => {
    if (isHost && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isHost, hasCamera, facingMode]);

  // Detectar cambios en me gustas para animar corazones flotantes de manera remota
  useEffect(() => {
    if (liveData && liveData.likes > prevLikesRef.current) {
      const diff = liveData.likes - prevLikesRef.current;
      const numHearts = Math.min(diff, 5); // limitar animaciones concurrentes
      for (let i = 0; i < numHearts; i++) {
        setTimeout(() => {
          setFloatingHearts((prev) => [
            ...prev,
            { id: Math.random() + Date.now(), x: Math.random() * 60 + 20 }
          ]);
        }, i * 150);
      }
      prevLikesRef.current = liveData.likes;
    }
  }, [liveData?.likes]);

  // Escuchar notificaciones de regalos en comentarios para disparar la animación global
  useEffect(() => {
    if (comments.length > 0) {
      const latestComment = comments[comments.length - 1];
      const commentTime = latestComment.timestamp ? new Date(latestComment.timestamp).getTime() : Date.now();
      const isRecent = Date.now() - commentTime < 4000;
      
      if (latestComment.isGift && isRecent) {
        setGiftAnimation({
          type: latestComment.giftIndex || 1,
          name: latestComment.giftType || "Gema",
          username: latestComment.username
        });
        
        // Lluvia de gemas doradas si es tipo 6 (Gema Dorada)
        if (latestComment.giftIndex === 6) {
          triggerGoldGemShower();
        }

        // Quitar la animación después de 3 segundos
        const timer = setTimeout(() => {
          setGiftAnimation(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [comments.length]);

  // Ocultar corazones expirados
  useEffect(() => {
    if (floatingHearts.length > 0) {
      const timer = setTimeout(() => {
        setFloatingHearts((prev) => prev.slice(1));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [floatingHearts]);

  // Finalizar transmisión (Host)
  const handleEndLive = async () => {
    if (!roomId) return;
    
    setFinalStats({
      likes: liveData?.likes || 0,
      viewers: liveData?.viewersCount || 0,
      gems: liveData?.gemsCount || 0
    });
    
    // Cambiar estado a ended
    const liveRef = doc(db, "lives", roomId);
    try {
      await updateDoc(liveRef, { status: "ended" });
    } catch (err) {
      console.error("Error ending live:", err);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setStreamActive(false);
    setShowStats(true);
  };

  // Enviar comentario
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    
    try {
      const commentsRef = collection(db, "lives", roomId, "comments");
      await addDoc(commentsRef, {
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email.split("@")[0] || "Anónimo",
        text: newComment.trim(),
        timestamp: new Date().toISOString()
      });
      setNewComment("");
    } catch (err) {
      console.error("Error al enviar comentario:", err);
    }
  };

  // Dar like en vivo (Viewer)
  const handleLike = async () => {
    if (!roomId) return;
    
    // Incrementar en Firestore
    const liveRef = doc(db, "lives", roomId);
    try {
      await updateDoc(liveRef, {
        likes: increment(1)
      });
    } catch (err) {
      console.error("Error incrementing likes:", err);
    }
  };

  // Regalar Gema (Viewer)
  const handleGiftGem = async (gemId, gemName) => {
    if (!currentUser || !liveData) return;
    const viewerRef = doc(db, "users", currentUser.uid);
    const hostRef = doc(db, "users", liveData.hostId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const viewerSnap = await transaction.get(viewerRef);
        const hostSnap = await transaction.get(hostRef);
        
        if (!viewerSnap.exists()) throw new Error("El documento del espectador no existe");
        if (!hostSnap.exists()) throw new Error("El documento del creador no existe");
        
        const viewerData = viewerSnap.data();
        const hostData = hostSnap.data();
        
        const gemKey = `coin_${gemId}`;
        const viewerGemCount = viewerData.coinCounts?.[gemKey] || 0;
        
        if (viewerGemCount < 1) {
          throw new Error(`No tienes suficientes gemas del tipo: ${gemName}`);
        }
        
        // Descontar gema del espectador
        const viewerCoins = viewerData.coins || 0;
        const viewerCoinCounts = { ...viewerData.coinCounts };
        viewerCoinCounts[gemKey] = viewerGemCount - 1;
        
        transaction.update(viewerRef, {
          coins: Math.max(0, viewerCoins - 1),
          coinCounts: viewerCoinCounts
        });
        
        // Acreditar gema al host
        const hostCoins = hostData.coins || 0;
        const hostCoinCounts = hostData.coinCounts || {
          coin_1: hostCoins,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        };
        hostCoinCounts[gemKey] = (hostCoinCounts[gemKey] || 0) + 1;
        
        transaction.update(hostRef, {
          coins: hostCoins + 1,
          coinCounts: hostCoinCounts
        });
      });
      
      // Registrar mensaje de regalo en el chat
      const commentsRef = collection(db, "lives", roomId, "comments");
      await addDoc(commentsRef, {
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email.split("@")[0] || "Espectador",
        text: `regaló una Gema ${gemName}! 🎁`,
        isGift: true,
        giftType: gemName,
        giftIndex: gemId,
        timestamp: new Date().toISOString()
      });
      
      setShowGiftsModal(false);

      // Incrementar gemsCount en el documento de transmisión
      const liveRef = doc(db, "lives", roomId);
      await updateDoc(liveRef, {
        gemsCount: increment(1)
      });
    } catch (err) {
      console.error("Error al regalar gema:", err);
      alert("Error: " + err.message);
    }
  };

  // Cargar artículos de la tienda (Host)
  const openPinProductModal = async () => {
    setShowProductsModal(true);
    try {
      const q = collection(db, "products");
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductsList(list);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  // Anclar Producto (Host)
  const handlePinProduct = async (product) => {
    if (!roomId) return;
    const liveRef = doc(db, "lives", roomId);
    try {
      await updateDoc(liveRef, {
        pinnedProduct: {
          id: product.id,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
          sellerId: product.sellerId,
          sellerPhone: product.sellerPhone || ""
        }
      });
      setShowProductsModal(false);
    } catch (err) {
      console.error("Error pinning product:", err);
    }
  };

  // Desanclar Producto (Host)
  const handleUnpinProduct = async () => {
    if (!roomId) return;
    const liveRef = doc(db, "lives", roomId);
    try {
      await updateDoc(liveRef, {
        pinnedProduct: null
      });
    } catch (err) {
      console.error("Error unpinning product:", err);
    }
  };

  // Si el stream ya no está activo
  if (!streamActive) {
    return (
      <div style={{
        width: "100%",
        height: "100vh",
        background: "black",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>👋</div>
        <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#FF0050", marginBottom: "10px" }}>
          Transmisión Finalizada
        </h2>
        <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "30px" }}>
          El anfitrión ha terminado este En Vivo. ¡Gracias por participar!
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "linear-gradient(135deg, #ff0050, #ff00ff)",
            color: "white",
            border: "none",
            borderRadius: "25px",
            padding: "12px 30px",
            fontSize: "15px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(255, 0, 80, 0.4)"
          }}
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  if (showStats) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(circle, #2a081a 0%, #000000 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        zIndex: 20000,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "40px",
          width: "90%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)"
        }}>
          <h2 style={{
            fontSize: "28px",
            fontWeight: "900",
            marginBottom: "10px",
            background: "linear-gradient(45deg, #00f2fe, #ff007f)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Resumen del Live
          </h2>
          <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "30px" }}>
            Estadísticas finales de la transmisión
          </p>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "15px",
            marginBottom: "35px"
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "15px 10px",
              borderRadius: "12px"
            }}>
              <span style={{ fontSize: "24px", display: "block", marginBottom: "5px" }}>❤️</span>
              <span style={{ fontSize: "18px", fontWeight: "bold", display: "block" }}>{finalStats.likes}</span>
              <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Likes</span>
            </div>
            
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "15px 10px",
              borderRadius: "12px"
            }}>
              <span style={{ fontSize: "24px", display: "block", marginBottom: "5px" }}>👥</span>
              <span style={{ fontSize: "18px", fontWeight: "bold", display: "block" }}>{finalStats.viewers}</span>
              <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Vistas</span>
            </div>
            
            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "15px 10px",
              borderRadius: "12px"
            }}>
              <span style={{ fontSize: "24px", display: "block", marginBottom: "5px" }}>💎</span>
              <span style={{ fontSize: "18px", fontWeight: "bold", display: "block" }}>{finalStats.gems}</span>
              <span style={{ fontSize: "10px", color: "#888", textTransform: "uppercase" }}>Gemas</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate("/")}
            style={{
              background: "linear-gradient(90deg, #00f2fe, #ff007f)",
              color: "white",
              border: "none",
              borderRadius: "25px",
              padding: "12px 35px",
              fontSize: "15px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 8px 25px rgba(255, 0, 127, 0.4)",
              transition: "transform 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Volver a PopTok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={handleScreenDoubleTap}
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        zIndex: 1000,
        boxSizing: "border-box",
        border: "3.5px solid transparent",
        borderRadius: "20px",
        background: "linear-gradient(black, black) padding-box, linear-gradient(135deg, #00f2fe 0%, #ff007f 50%, #9d00ff 100%) border-box",
        boxShadow: "inset 0 0 20px rgba(0, 242, 254, 0.2)"
      }}>
      {/* Video stream viewport */}
      {isHost ? (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: hasCamera ? "block" : "none"
            }}
          />
          {!hasCamera && (
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
              {liveData && (
                <div style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  marginBottom: "20px"
                }}>
                  <div className="pulsing-halo" style={{
                    position: "absolute",
                    inset: "-10px",
                    borderRadius: "50%",
                    border: "4px solid #FF0050",
                    boxShadow: "0 0 30px #FF0050",
                    animation: "ping-glow-large 2s infinite ease-out"
                  }} />
                  <img
                    src={liveData.hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(liveData.hostName)}&background=ff0050&color=fff&bold=true`}
                    alt="Creador"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid #000"
                    }}
                  />
                </div>
              )}
              <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: "10px 0 5px" }}>
                @{liveData?.hostName || "Creador"}
              </h3>
              <p style={{ color: "#aaa", fontSize: "14px", margin: "0" }}>
                Transmitiendo en Vivo...
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Viewer visualizer */
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
          {liveData && (
            <div style={{
              position: "relative",
              width: "140px",
              height: "140px",
              marginBottom: "20px"
            }}>
              <div className="pulsing-halo" style={{
                position: "absolute",
                inset: "-10px",
                borderRadius: "50%",
                border: "4px solid #FF0050",
                boxShadow: "0 0 30px #FF0050",
                animation: "ping-glow-large 2s infinite ease-out"
              }} />
              <img
                src={liveData.hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(liveData.hostName)}&background=ff0050&color=fff&bold=true`}
                alt="Creador"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "4px solid #000"
                }}
              />
            </div>
          )}
          <h3 style={{ fontSize: "20px", fontWeight: "bold", margin: "10px 0 5px" }}>
            @{liveData?.hostName || "Creador"}
          </h3>
          <p style={{ color: "#aaa", fontSize: "14px", margin: "0" }}>
            Espectando en Vivo...
          </p>
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
        {/* Live Badge & Host profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* 🔴 Live badge style matching reference image */}
          <div style={{
            background: "rgba(255, 0, 80, 0.15)",
            border: "1.5px solid #FF0050",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "bold",
            letterSpacing: "0.5px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 0 10px rgba(255, 0, 80, 0.3)"
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#FF0050",
              display: "inline-block",
              boxShadow: "0 0 8px #FF0050"
            }} />
            Live
          </div>

          {/* 👥 Followers count styling matching reference image */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 8px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#00f2fe",
              fontSize: "15px",
              fontWeight: "bold",
              textShadow: "0 0 8px rgba(0, 242, 254, 0.4)"
            }}>
              <FiUsers size={16} style={{ color: "#00f2fe" }} /> {viewers}
            </div>
            <span style={{
              fontSize: "9px",
              color: "#a0e9ff",
              fontWeight: "600",
              marginTop: "1px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Seguidores Viendo
            </span>
          </div>
        </div>

        {/* Action button: End live or Exit */}
        {isHost ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={openPinProductModal}
              style={{
                background: "rgba(0, 242, 254, 0.1)",
                color: "#00f2fe",
                border: "1.5px solid #00f2fe",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 10px rgba(0, 242, 254, 0.2)",
                transition: "all 0.2s"
              }}
            >
              🛍️ Promocionar
            </button>
            <button
              onClick={handleEndLive}
              style={{
                background: "rgba(255, 0, 80, 0.15)",
                color: "white",
                border: "1.5px solid #FF0050",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 10px rgba(255, 0, 80, 0.2)",
                transition: "all 0.2s"
              }}
            >
              🛑 Finalizar
            </button>
          </div>
        ) : (
          <button
            onClick={handleExitLive}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Salir
          </button>
        )}
      </div>

      {/* Pinned Product Bubble (Top center floating bar) */}
      {liveData?.pinnedProduct && (
        <div style={{
          position: "absolute",
          top: "80px",
          left: "20px",
          right: "20px",
          background: "rgba(0, 0, 0, 0.85)",
          border: "1px solid rgba(255, 0, 80, 0.3)",
          borderRadius: "15px",
          padding: "10px 15px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 15,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          animation: "slide-down 0.4s ease-out"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={liveData.pinnedProduct.imageUrl}
              alt="Producto"
              style={{
                width: "45px",
                height: "45px",
                borderRadius: "8px",
                objectFit: "cover"
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", color: "#FF0050", fontWeight: "bold", textTransform: "uppercase" }}>Artículo Recomendado</span>
              <span style={{ fontSize: "13px", color: "white", fontWeight: "bold", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {liveData.pinnedProduct.title}
              </span>
              <span style={{ fontSize: "12px", color: "#00f2fe", fontWeight: "bold" }}>
                ${liveData.pinnedProduct.price} USD
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => {
                const text = `Hola, te contacto desde tu transmisión en vivo en Poptok. Estoy interesado en tu producto en venta: "${liveData.pinnedProduct.title}".`;
                const cleanPhone = liveData.pinnedProduct.sellerPhone
                  .replace(/\+/g, "")
                  .replace(/\s/g, "")
                  .replace(/-/g, "");
                const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
                window.open(url, "_blank");
              }}
              style={{
                background: "linear-gradient(135deg, #ff0050, #ff00ff)",
                color: "white",
                border: "none",
                borderRadius: "20px",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(255, 0, 80, 0.4)"
              }}
            >
              Comprar / Ver
            </button>
            {isHost && (
              <button
                onClick={handleUnpinProduct}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#aaa",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  cursor: "pointer"
                }}
                title="Desanclar artículo"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Real-time Gem Gift Animation Overlay */}
      {giftAnimation && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 100,
          animation: "giftPop 3s ease-out forwards",
          pointerEvents: "none"
        }}>
          <img
            src={coinImages[giftAnimation.type]}
            alt={giftAnimation.name}
            style={{
              width: "120px",
              height: "120px",
              filter: `drop-shadow(0 0 20px ${coinColors[giftAnimation.type]})`,
              animation: "spin 2s linear infinite"
            }}
          />
          <div style={{
            background: "rgba(0,0,0,0.85)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "25px",
            padding: "10px 24px",
            color: "white",
            marginTop: "15px",
            fontSize: "14px",
            fontWeight: "bold",
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)"
          }}>
            🎁 @{giftAnimation.username} regaló Gema {giftAnimation.name}!
          </div>
        </div>
      )}

      {/* Floating Hearts Elements (Viewer and shared) */}
      <div style={{
        position: "absolute",
        bottom: "80px",
        right: "20px",
        width: "100px",
        height: "300px",
        pointerEvents: "none",
        zIndex: 9
      }}>
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            style={{
              position: "absolute",
              bottom: "0",
              left: `${heart.x}px`,
              fontSize: "28px",
              color: "#FF0050",
              animation: "floatUp 1.2s ease-out forwards",
              pointerEvents: "none"
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Comments Thread Overlay (Bottom Left) */}
      <div style={{
        position: "absolute",
        bottom: "80px",
        left: "20px",
        width: "80%",
        maxWidth: "350px",
        height: "240px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "end",
        gap: "6px",
        overflowY: "auto",
        zIndex: 10,
        maskImage: "linear-gradient(to top, black 85%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 85%, transparent 100%)",
        scrollbarWidth: "none"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "10px" }}>
          {comments.map((comment, index) => {
            if (comment.isGift) {
              return (
                <div key={comment.id || index} style={{
                  background: "rgba(255, 215, 0, 0.15)",
                  border: "1px solid rgba(255, 215, 0, 0.3)",
                  padding: "8px 12px",
                  borderRadius: "15px",
                  alignSelf: "flex-start",
                  fontSize: "13px",
                  color: "#FFF",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <img src={coinImages[comment.giftIndex || 1]} style={{ width: "16px", height: "16px" }} alt="gem" />
                  <span style={{ color: "#FFD700" }}>@{comment.username}</span>
                  <span>{comment.text}</span>
                </div>
              );
            }

            return (
              <div key={comment.id || index} style={{
                background: "rgba(0,0,0,0.5)",
                padding: "6px 12px",
                borderRadius: "15px",
                alignSelf: "flex-start",
                fontSize: "13px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ color: "#FF99B0", fontWeight: "bold", marginRight: "6px" }}>
                  @{comment.username}
                </span>
                <span style={{ color: "white" }}>{comment.text}</span>
              </div>
            );
          })}
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* Right Side Floating Actions Column */}
      <div style={{
        position: "absolute",
        top: "50%",
        right: "15px",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        zIndex: 30
      }}>
        {/* Heart/Like Button & Count */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <button
            onClick={isHost ? null : handleLike}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(0, 0, 0, 0.65)",
              border: "2px solid #FF0050",
              boxShadow: "0 0 12px rgba(255,0,80,0.4)",
              color: "#FF0050",
              fontSize: "22px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: isHost ? "default" : "pointer",
              transition: "transform 0.1s"
            }}
            title={isHost ? "Me Gusta recibidos" : "Dar Me Gusta"}
            onMouseDown={(e) => { if (!isHost) e.currentTarget.style.transform = "scale(0.85)"; }}
            onMouseUp={(e) => { if (!isHost) e.currentTarget.style.transform = "scale(1)"; }}
            onMouseLeave={(e) => { if (!isHost) e.currentTarget.style.transform = "scale(1)"; }}
          >
            <AiFillHeart />
          </button>
          <span style={{
            color: "white",
            fontSize: "12px",
            fontWeight: "bold",
            background: "rgba(0,0,0,0.6)",
            padding: "2px 8px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            textAlign: "center"
          }}>
            {liveData?.likes || 0}
          </span>
        </div>

        {/* Gift Gem trigger (Viewer Only) */}
        {!isHost && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setShowGiftsModal(true)}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.65)",
                border: "2px solid #9d00ff",
                boxShadow: "0 0 12px rgba(157,0,255,0.4)",
                color: "white",
                fontSize: "22px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer"
              }}
              title="Regalar Gemas"
            >
              💎
            </button>
            <span style={{
              color: "white",
              fontSize: "11px",
              fontWeight: "bold",
              background: "rgba(0,0,0,0.6)",
              padding: "2px 8px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center"
            }}>
              Regalar
            </span>
          </div>
        )}
      </div>

      {/* Voltear Cámara Button (Bottom Center - Host Only) */}
      {isHost && hasCamera && (
        <div style={{
          position: "absolute",
          bottom: "85px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer"
        }} onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")}>
          <div style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.6)",
            border: "2px solid #ff00ff",
            boxShadow: "0 0 12px rgba(255, 0, 255, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontSize: "20px"
          }}>
            📷
          </div>
          <span style={{
            color: "#fff",
            fontSize: "11px",
            fontWeight: "bold",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)"
          }}>
            Voltear cámara
          </span>
        </div>
      )}

      {/* Input bar and action panels (Bottom) */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        right: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 20
      }}>
        {/* Comment input form */}
        <form onSubmit={handleSendComment} style={{
          display: "flex",
          gap: "8px",
          flex: 1
        }}>
          <input
            type="text"
            placeholder="Enviar comentario..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            style={{
              flex: 1,
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "20px",
              padding: "10px 16px",
              color: "white",
              fontSize: "13px",
              outline: "none"
            }}
          />
          <button type="submit" style={{
            background: "#FF0050",
            color: "white",
            border: "none",
            borderRadius: "20px",
            padding: "0 16px",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer"
          }}>
            Enviar
          </button>
        </form>
      </div>

      {/* MODAL: REGALAR GEMAS */}
      {showGiftsModal && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          zIndex: 100,
          animation: "fade-in 0.2s ease-out"
        }} onClick={() => setShowGiftsModal(false)}>
          <div style={{
            width: "100%",
            maxWidth: "450px",
            background: "#18181b",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            padding: "24px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            animation: "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "white", fontSize: "18px", fontWeight: "bold" }}>
                🎁 Regalar Gemas al Creador
              </h3>
              <button
                onClick={() => setShowGiftsModal(false)}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}
              >
                <FiX size={20} />
              </button>
            </div>

            <p style={{ color: "#aaa", fontSize: "12px", margin: "0 0 20px", lineHeight: "1.4" }}>
              Selecciona una gema de tu inventario. Al enviarla, el saldo se transferirá al creador y se notificará en la transmisión.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginBottom: "20px"
            }}>
              {[1, 2, 3, 4, 5, 6].map(id => {
                const balance = userProfile?.coinCounts?.[`coin_${id}`] || 0;
                return (
                  <div key={id} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    textAlign: "center"
                  }}>
                    <img
                      src={coinImages[id]}
                      style={{
                        width: "36px",
                        height: "36px",
                        filter: `drop-shadow(0 0 5px ${coinColors[id]})`
                      }}
                      alt={coinNames[id]}
                    />
                    <span style={{ fontSize: "11px", color: coinColors[id], fontWeight: "bold" }}>
                      {coinNames[id]}
                    </span>
                    <span style={{ fontSize: "11px", color: "#888" }}>
                      Tienes: <strong style={{ color: balance > 0 ? "white" : "#ef4444" }}>{balance}</strong>
                    </span>
                    <button
                      onClick={() => handleGiftGem(id, coinNames[id])}
                      disabled={balance < 1}
                      style={{
                        background: balance > 0 ? coinColors[id] : "#3f3f46",
                        color: balance > 0 ? "black" : "#71717a",
                        border: "none",
                        borderRadius: "15px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: balance > 0 ? "pointer" : "default",
                        marginTop: "4px",
                        width: "100%"
                      }}
                    >
                      Enviar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANCLAR PRODUCTOS DE LA TIENDA (Host Only) */}
      {showProductsModal && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          zIndex: 100,
          animation: "fade-in 0.2s ease-out"
        }} onClick={() => setShowProductsModal(false)}>
          <div style={{
            width: "100%",
            maxWidth: "450px",
            height: "80vh",
            background: "#18181b",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            padding: "24px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            animation: "slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 }}>
              <h3 style={{ margin: 0, color: "white", fontSize: "18px", fontWeight: "bold" }}>
                🛍️ Anclar Artículo para Promoción
              </h3>
              <button
                onClick={() => setShowProductsModal(false)}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}
              >
                <FiX size={20} />
              </button>
            </div>

            <p style={{ color: "#aaa", fontSize: "12px", margin: "0 0 15px", lineHeight: "1.4", flexShrink: 0 }}>
              Selecciona uno de tus productos o un producto general de la tienda para anclarlo en una burbuja superior durante la transmisión.
            </p>

            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingBottom: "20px"
            }}>
              {/* Mis artículos */}
              <div style={{ fontSize: "12px", color: "#00f2fe", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px" }}>
                Mis artículos en venta
              </div>
              {productsList.filter(p => p.sellerId === currentUser?.uid).map(prod => (
                <div key={prod.id} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={prod.imageUrl} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} alt="" />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "13px", color: "white", fontWeight: "bold" }}>{prod.title}</span>
                      <span style={{ fontSize: "12px", color: "#aaa" }}>${prod.price}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePinProduct(prod)}
                    style={{
                      background: "#FF0050",
                      color: "white",
                      border: "none",
                      borderRadius: "15px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Anclar
                  </button>
                </div>
              ))}
              {productsList.filter(p => p.sellerId === currentUser?.uid).length === 0 && (
                <div style={{ fontSize: "12px", color: "#666", italic: "true", padding: "5px 0 15px" }}>
                  No tienes artículos publicados en la tienda.
                </div>
              )}

              {/* Otros artículos */}
              <div style={{ fontSize: "12px", color: "#FF0050", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "10px", marginBottom: "5px" }}>
                Otros artículos / Tiendas oficiales
              </div>
              {productsList.filter(p => p.sellerId !== currentUser?.uid).map(prod => (
                <div key={prod.id} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={prod.imageUrl} style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }} alt="" />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "13px", color: "white", fontWeight: "bold" }}>{prod.title}</span>
                      <span style={{ fontSize: "12px", color: "#888" }}>Por @{prod.sellerName?.split("@")[0]} • ${prod.price}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePinProduct(prod)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      color: "white",
                      border: "none",
                      borderRadius: "15px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Anclar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tap Effect Particles */}
      {particles.map((p) => {
        if (p.type === "heart") {
          return (
            <div
              key={p.id}
              className="tap-effect-particle heart"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                position: "absolute",
                "--scale": p.scale,
                "--angle": `${p.angle}deg`,
                zIndex: 9999,
                pointerEvents: "none"
              }}
            >
              {p.emoji}
            </div>
          );
        } else {
          return (
            <div
              key={p.id}
              className="tap-effect-particle sparkle"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                position: "absolute",
                color: p.color,
                "--dx": `${p.tx}px`,
                "--dy": `${p.ty}px`,
                "--scale": p.scale,
                "--angle": `${p.angle}deg`,
                zIndex: 9999,
                pointerEvents: "none"
              }}
            >
              {p.emoji}
            </div>
          );
        }
      })}

      {/* Gold Gems Shower */}
      {goldGems.map((gem) => (
        <div
          key={gem.id}
          className="flying-gold-gem"
          style={{
            position: "fixed",
            left: `${gem.x}px`,
            top: `${gem.y}px`,
            width: "36px",
            height: "36px",
            backgroundImage: `url(${coin6})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            zIndex: 12000,
            pointerEvents: "none",
            "--tx": `${gem.tx}px`,
            "--ty": `${gem.ty}px`,
            "--scale": gem.scale,
            "--rot": `${gem.rot}deg`,
            animationDelay: `${gem.delay}ms`
          }}
        />
      ))}

      {/* Embedded Animations and Keyframes */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-260px) scale(0.5) rotate(20deg);
            opacity: 0;
          }
        }
        @keyframes giftPop {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          15% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
          }
          20% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          85% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ping-glow-large {
          0% {
            transform: scale(0.9);
            opacity: 1;
          }
          70% {
            transform: scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }
        @keyframes slide-down {
          0% { transform: translateY(-50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-up {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LiveStream;
