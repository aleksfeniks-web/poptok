import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase.js";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { AiFillHeart, AiOutlineClose } from "react-icons/ai";
import { BsAward, BsCoin, BsGrid3X3Gap } from "react-icons/bs";
import { FaUserEdit, FaInstagram, FaTwitter, FaYoutube, FaPaypal, FaExternalLinkAlt } from "react-icons/fa";

import coin1 from "../assets/coin_1.svg";
import coin2 from "../assets/coin_2.svg";
import coin3 from "../assets/coin_3.svg";
import coin4 from "../assets/coin_4.svg";
import coin5 from "../assets/coin_5.svg";
import coin6 from "../assets/coin_6.svg";

const PEXELS_DEMO_VIDEOS = [
  {
    riuzaki1234: "demo-1",
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
    username: "Mixkit",
    description: "🌊 Olas del océano al atardecer",
    interest: "Lifestyle",
    likes: 142,
    favorites: 38,
    coins: 5,
    comments: [],
    isPexels: true,
  },
  {
    riuzaki1234: "demo-2",
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-at-night-11-large.mp4",
    username: "Mixkit",
    description: "🌆 Ciudad de noche vista desde el aire",
    interest: "Lifestyle",
    likes: 209,
    favorites: 61,
    coins: 8,
    comments: [],
    isPexels: true,
  },
  {
    riuzaki1234: "demo-3",
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4",
    username: "Mixkit",
    description: "🌌 Galaxia y estrellas en movimiento",
    interest: "Science & Tech",
    likes: 318,
    favorites: 97,
    coins: 12,
    comments: [],
    isPexels: true,
  },
  {
    riuzaki1234: "demo-4",
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
    username: "Mixkit",
    description: "🌿 Arroyo en el bosque con luz solar",
    interest: "Lifestyle",
    likes: 87,
    favorites: 24,
    coins: 3,
    comments: [],
    isPexels: true,
  },
  {
    riuzaki1234: "demo-5",
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-sea-waves-on-the-beach-1181-large.mp4",
    username: "Mixkit",
    description: "🏖️ Olas suaves en la playa",
    interest: "Lifestyle",
    likes: 453,
    favorites: 121,
    coins: 16,
    comments: [],
    isPexels: true,
  },
  {
    riuzaki1234: "demo-6",
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-spinning-around-the-earth-29351-large.mp4",
    username: "Mixkit",
    description: "🌍 La Tierra vista desde el espacio",
    interest: "Science & Tech",
    likes: 274,
    favorites: 73,
    coins: 9,
    comments: [],
    isPexels: true,
  },
];

const Profile = ({ onSelectVideo }) => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [instagramLink, setInstagramLink] = useState("");
  const [twitterLink, setTwitterLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [customLink, setCustomLink] = useState("");
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const [coinCounts, setCoinCounts] = useState({
    coin_1: 0,
    coin_2: 0,
    coin_3: 0,
    coin_4: 0,
    coin_5: 0,
    coin_6: 0,
    coin_7: 0
  });
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState(0);
  const [devWatchTime, setDevWatchTime] = useState(0);
  const [favoriteVideos, setFavoriteVideos] = useState([]);
  const [activeTab, setActiveTab] = useState("my-videos"); // "my-videos" | "favorites"
  const [showFollowModal, setShowFollowModal] = useState(null); // null | "followers" | "following"
  const [followUsersList, setFollowUsersList] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const videosRef = useRef(null);

  const openFollowModal = async (type) => {
    setShowFollowModal(type);
    setLoadingFollowList(true);
    setFollowUsersList([]);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const uids = type === "followers" ? (data.followers || []) : (data.following || []);
        if (uids.length > 0) {
          const promises = uids.map(async (uid) => {
            const docSnap = await getDoc(doc(db, "users", uid));
            if (docSnap.exists()) {
              return { id: docSnap.id, ...docSnap.data() };
            }
            return { id: uid, name: "Usuario de Poptok", email: "Sin correo" };
          });
          const list = await Promise.all(promises);
          setFollowUsersList(list);
        }
      }
    } catch (err) {
      console.error("Error loading follow list:", err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const scrollToVideos = () => {
    setActiveTab("my-videos");
    videosRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setDisplayName(u.displayName || "Creador Poptok");
        await fetchUserData(u.uid);
        await fetchUserVideos(u.uid);
      } else {
        setUser(null);
        setUserVideos([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setCoins(data.coins || 0);
        setHighScore(data.highScore || 0);
        setPaypalEmail(data.paypalEmail || "");
        const social = data.socialLinks || {};
        setInstagramLink(social.instagram || "");
        setTwitterLink(social.twitter || "");
        setYoutubeLink(social.youtube || "");
        setCustomLink(social.custom || "");
        setFollowersCount(Array.isArray(data.followers) ? data.followers.length : 0);
        setFollowingCount(Array.isArray(data.following) ? data.following.length : 0);
        
        // Cargar coinCounts y hacer fallback si no existen, migrando las existentes
        setCoinCounts(data.coinCounts || {
          coin_1: data.coins || 0,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        });

        // Obtener videos favoritos
        await fetchFavoriteVideos(uid, data.favorites || []);
      }
    } catch (err) {
      console.error("Error al obtener datos de perfil en Firestore:", err);
    }
  };

  const fetchFavoriteVideos = async (uid, favoritesArray) => {
    if (!favoritesArray || favoritesArray.length === 0) {
      setFavoriteVideos([]);
      return;
    }

    try {
      const loaded = await Promise.all(
        favoritesArray.map(async (vidId) => {
          if (vidId.startsWith("demo-")) {
            const demoVideo = PEXELS_DEMO_VIDEOS.find((v) => v.riuzaki1234 === vidId);
            return demoVideo || null;
          } else {
            const videoRef = doc(db, "videos", vidId);
            const videoSnap = await getDoc(videoRef);
            if (videoSnap.exists()) {
              return { riuzaki1234: videoSnap.id, ...videoSnap.data() };
            }
          }
          return null;
        })
      );
      setFavoriteVideos(loaded.filter((v) => v !== null));
    } catch (err) {
      console.error("Error al obtener videos favoritos:", err);
    }
  };

  const handleBuyGems = async (amount) => {
    if (!user) return;
    setIsPurchasing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simular pasarela segura
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentCoins = data.coins || 0;
        const currentCounts = data.coinCounts || {
          coin_1: currentCoins,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        };

        currentCounts.coin_6 = (currentCounts.coin_6 || 0) + amount;

        await updateDoc(userRef, {
          coins: currentCoins + amount,
          coinCounts: currentCounts
        });

        setPurchasedAmount(amount);
        setPurchaseSuccess(true);
        await fetchUserData(user.uid);
      }
    } catch (error) {
      console.error("Error al comprar gemas doradas:", error);
      alert("Error al procesar la compra.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSimulateWatchTime = () => {
    const cur = Number(localStorage.getItem("poptok_cumulative_watch_time") || 0);
    const next = cur + 36000; // +10 horas
    localStorage.setItem("poptok_cumulative_watch_time", next);
    setDevWatchTime(next);
    alert(`⏳ Watch time simulado: +10 Horas. Total acumulado: ${(next / 3600).toFixed(1)} horas.`);
  };

  // Cargar devWatchTime al iniciar
  useEffect(() => {
    setDevWatchTime(Number(localStorage.getItem("poptok_cumulative_watch_time") || 0));
  }, []);

  const fetchUserVideos = async (uid) => {
    try {
      const videosRef = collection(db, "videos");
      const q = query(videosRef, where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      
      const videos = querySnapshot.docs.map((doc) => ({
        riuzaki1234: doc.id,
        ...doc.data()
      }));
      
      // Sort manually by createdAt desc since composite indexes might not be built yet
      videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setUserVideos(videos);
    } catch (err) {
      console.error("Error al obtener videos del usuario en Firestore:", err);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: displayName.trim()
      });

      // 2. Update Firestore User Document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: displayName.trim(),
        paypalEmail: paypalEmail.trim(),
        socialLinks: {
          instagram: instagramLink.trim(),
          twitter: twitterLink.trim(),
          youtube: youtubeLink.trim(),
          custom: customLink.trim()
        }
      });

      setIsEditing(false);
      alert("✅ ¡Perfil actualizado correctamente!");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("Error al actualizar el perfil.");
    }
  };

  const handleSignOut = async () => {
    try {
      if (window.PoptokAndroid && typeof window.PoptokAndroid.signOutGoogle === 'function') {
        window.PoptokAndroid.signOutGoogle();
      }
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión.");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const path = `avatars/${user.uid}.png`;
      const ref = storageRef(storage, path);
      
      await uploadBytes(ref, file);
      const downloadUrl = await getDownloadURL(ref);

      // 1. Update auth photoURL
      await updateProfile(user, { photoURL: downloadUrl });
      
      // 2. Update firestore doc
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePic: downloadUrl });

      // Force re-render of local state
      setUser({ ...auth.currentUser, photoURL: downloadUrl });
      alert("✅ ¡Foto de perfil actualizada!");
    } catch (err) {
      console.error("Error al subir foto de perfil:", err);
      alert("Error al subir la imagen: " + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "#aaa" }}>Cargando perfil del creador...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <p style={{ color: "#aaa", fontSize: "16px" }}>⚠️ Por favor, inicia sesión para ver tu perfil de creador.</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Tarjeta de Encabezado de Perfil */}
      <div className="profile-header-card">
        <div className="profile-avatar-large-wrapper" onClick={() => avatarInputRef.current?.click()} style={{ cursor: "pointer", position: "relative" }}>
          <img
            src={user.photoURL || "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"}
            alt="Avatar"
            className="profile-avatar-large"
          />
          {uploadingAvatar ? (
            <div className="avatar-upload-overlay">Subiendo...</div>
          ) : (
            <div className="avatar-upload-overlay">
              <FaUserEdit size={16} />
            </div>
          )}
          <input
            type="file"
            ref={avatarInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>

        {isEditing ? (
            <div className="profile-edit-section">
              <label className="profile-edit-label">Nombre de Usuario</label>
              <input
                type="text"
                className="profile-edit-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nombre de Usuario"
                maxLength={20}
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Paypal Email (para recibir donaciones)</label>
              <input
                type="email"
                className="profile-edit-input"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="correo@paypal.com"
                maxLength={50}
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Enlace de Instagram</label>
              <input
                type="url"
                className="profile-edit-input"
                value={instagramLink}
                onChange={(e) => setInstagramLink(e.target.value)}
                placeholder="https://instagram.com/usuario"
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Enlace de X / Twitter</label>
              <input
                type="url"
                className="profile-edit-input"
                value={twitterLink}
                onChange={(e) => setTwitterLink(e.target.value)}
                placeholder="https://x.com/usuario"
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Enlace de YouTube</label>
              <input
                type="url"
                className="profile-edit-input"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="https://youtube.com/@usuario"
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Sitio Web / Linktree</label>
              <input
                type="url"
                className="profile-edit-input"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="https://miweb.com"
              />
              <button className="profile-save-button" onClick={handleSaveProfile} style={{ marginTop: "15px" }}>
                Guardar Cambios
              </button>
              <button
                className="profile-save-button"
                style={{ background: "#444", marginTop: "5px" }}
                onClick={() => {
                  setDisplayName(user.displayName || "Creador Poptok");
                  fetchUserData(user.uid);
                  setIsEditing(false);
                }}
              >
                Cancelar
              </button>
            </div>
        ) : (
          <>
            <h2 className="profile-name-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {user.displayName || "Creador Poptok"}
            </h2>
            <p className="profile-email-sub">{user.email}</p>
            <div className="profile-social-links" style={{ display: "flex", gap: "14px", justifyContent: "center", marginTop: "10px" }}>
              {instagramLink && (
                <a href={instagramLink} target="_blank" rel="noopener noreferrer" style={{ color: "#e1306c", display: "flex", alignItems: "center" }}>
                  <FaInstagram size={22} />
                </a>
              )}
              {twitterLink && (
                <a href={twitterLink} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", display: "flex", alignItems: "center" }}>
                  <FaTwitter size={22} />
                </a>
              )}
              {youtubeLink && (
                <a href={youtubeLink} target="_blank" rel="noopener noreferrer" style={{ color: "#ff0000", display: "flex", alignItems: "center" }}>
                  <FaYoutube size={22} />
                </a>
              )}
              {paypalEmail && (
                <a href={`https://www.paypal.com/donate?business=${paypalEmail}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0070ba", display: "flex", alignItems: "center" }}>
                  <FaPaypal size={22} />
                </a>
              )}
              {customLink && (
                <a href={customLink} target="_blank" rel="noopener noreferrer" style={{ color: "#00f2fe", display: "flex", alignItems: "center" }}>
                  <FaExternalLinkAlt size={20} />
                </a>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "12px" }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#fff",
                  borderRadius: "15px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                ✏️ Editar Perfil
              </button>
              <button
                onClick={handleSignOut}
                className="profile-logout-btn"
                style={{
                  background: "rgba(255, 0, 80, 0.12)",
                  border: "1px solid rgba(255, 0, 80, 0.4)",
                  color: "#ff0050",
                  borderRadius: "15px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255, 0, 80, 0.25)";
                  e.currentTarget.style.border = "1px solid #ff0050";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 0, 80, 0.12)";
                  e.currentTarget.style.border = "1px solid rgba(255, 0, 80, 0.4)";
                }}
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          </>
        )}

        {/* Fila de Estadísticas */}
        <div className="profile-stats-row">
          <div className="profile-stat-item" onClick={() => { setPurchaseSuccess(false); setShowPurchaseModal(true); }} style={{ cursor: "pointer" }}>
            <span className="profile-stat-val coins" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "15px" }}>
              <img src={coin6} alt="Gema" style={{ width: "15px", height: "15px", "--glow-color": "#fbbf24", border: "none", borderRadius: "0", background: "none", boxShadow: "none" }} className="rotating-gem" /> {coins}
            </span>
            <span className="profile-stat-lbl" style={{ fontSize: "10px" }}>Gemas</span>
          </div>
          <div className="profile-stat-item" onClick={() => openFollowModal("followers")} style={{ cursor: "pointer" }}>
            <span className="profile-stat-val" style={{ color: "#ff0080" }}>
              {followersCount}
            </span>
            <span className="profile-stat-lbl">Seguidores</span>
          </div>
          <div className="profile-stat-item" onClick={() => openFollowModal("following")} style={{ cursor: "pointer" }}>
            <span className="profile-stat-val" style={{ color: "#00ff80" }}>
              {followingCount}
            </span>
            <span className="profile-stat-lbl">Seguidos</span>
          </div>
          <div className="profile-stat-item" onClick={scrollToVideos} style={{ cursor: "pointer" }}>
            <span className="profile-stat-val" style={{ color: "#00ffff" }}>
              <BsGrid3X3Gap style={{ verticalAlign: "middle" }} /> {userVideos.length}
            </span>
            <span className="profile-stat-lbl">Videos</span>
          </div>
        </div>
      </div>

      {/* Control de Testing de Tiempo de Reproducción */}
      <div style={{
        marginTop: "15px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        padding: "12px 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
        color: "#aaa"
      }}>
        <div>
          ⏱️ Tiempo de reproducción acumulado: <strong style={{ color: "#00ffff" }}>{(devWatchTime / 3600).toFixed(2)} horas</strong> ({devWatchTime} segundos)
        </div>
        <button
          onClick={handleSimulateWatchTime}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "15px",
            padding: "5px 12px",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "11px",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.18)"}
          onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
        >
          ⚙️ Simular +10 Horas
        </button>
      </div>

      {/* Sección de Inventario de Gemas */}
      <div className="profile-gems-section" style={{
        marginTop: "20px",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "16px",
        padding: "20px",
        border: "1px solid rgba(255, 255, 255, 0.08)"
      }}>
        <h3 style={{
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#fff"
        }}>
          💎 Mi Inventario de Gemas (Poptok Coins)
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
          gap: "10px"
        }}>
          {[
            { id: 1, name: "Gema Rosa", img: coin1, desc: "Común (Ver videos)", color: "#FF69B4" },
            { id: 2, name: "Gema Naranja", img: coin2, desc: "Poco común (2h)", color: "#FF8C00" },
            { id: 3, name: "Gema Verde", img: coin3, desc: "Rara (6h)", color: "#32CD32" },
            { id: 4, name: "Gema Púrpura", img: coin4, desc: "Épica (16h)", color: "#BA55D3" },
            { id: 5, name: "Gema Azul", img: coin5, desc: "Legendaria (40h)", color: "#1E90FF" },
            { id: 6, name: "Gema Dorada", img: coin6, desc: "Dinero Real", color: "#FFD700", isGolden: true }
          ].map((gem) => {
            const count = coinCounts[`coin_${gem.id}`] || 0;
            return (
              <div key={gem.id} style={{
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "12px",
                padding: "8px 6px",
                textAlign: "center",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "4px",
                transition: "transform 0.2s"
              }} className="gem-inventory-card">
                <img
                  src={gem.img}
                  alt={gem.name}
                  className="rotating-gem"
                  style={{
                    width: "24px",
                    height: "24px",
                    "--glow-color": gem.color
                  }}
                />
                <div style={{ fontWeight: "bold", fontSize: "11px", color: gem.color }}>
                  {gem.name}
                </div>
                <div style={{ fontSize: "8px", color: "#888", minHeight: "22px", lineHeight: "1.1" }}>
                  {gem.desc}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
                  x{count}
                </div>
                {gem.isGolden && (
                  <button
                    onClick={() => {
                      setPurchaseSuccess(false);
                      setShowPurchaseModal(true);
                    }}
                    style={{
                      background: "linear-gradient(45deg, #FFD700, #FFA500)",
                      border: "none",
                      borderRadius: "12px",
                      padding: "4px 8px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      color: "#000",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(255, 215, 0, 0.2)",
                      transition: "transform 0.1s",
                      marginTop: "2px"
                    }}
                    className="gem-buy-btn"
                  >
                    Comprar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selector de pestañas */}
      <div ref={videosRef} style={{
        display: "flex",
        justifyContent: "center",
        borderBottom: "1px solid #333",
        marginTop: "30px",
        marginBottom: "20px",
        gap: "40px"
      }}>
        <button
          onClick={() => setActiveTab("my-videos")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "my-videos" ? "2px solid #ff0050" : "2px solid transparent",
            color: activeTab === "my-videos" ? "#ff0050" : "#888",
            fontSize: "16px",
            fontWeight: "bold",
            paddingBottom: "10px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          📽️ Mis Videos ({userVideos.length})
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "favorites" ? "2px solid #ffbb00" : "2px solid transparent",
            color: activeTab === "favorites" ? "#ffbb00" : "#888",
            fontSize: "16px",
            fontWeight: "bold",
            paddingBottom: "10px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          ⭐ Mis Favoritos ({favoriteVideos.length})
        </button>
      </div>

      {/* Grid de videos según la pestaña seleccionada */}
      {activeTab === "my-videos" ? (
        userVideos.length === 0 ? (
          <p className="profile-no-videos" style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No has subido ningún video todavía. ¡Comparte tu primer video!
          </p>
        ) : (
          <div className="profile-videos-grid">
            {userVideos.map((video) => (
              <div
                key={video.riuzaki1234}
                className="profile-video-card"
                onClick={() => setSelectedVideo(video)}
              >
                <video className="profile-video-thumbnail" muted preload="metadata">
                  <source src={video.fileUrl} type="video/mp4" />
                </video>
                <div className="profile-video-likes-badge">
                  <AiFillHeart /> {video.likes || 0}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        favoriteVideos.length === 0 ? (
          <p className="profile-no-videos" style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No tienes ningún video guardado en favoritos todavía.
          </p>
        ) : (
          <div className="profile-videos-grid">
            {favoriteVideos.map((video) => (
              <div
                key={video.riuzaki1234}
                className="profile-video-card"
                onClick={() => setSelectedVideo(video)}
              >
                <video className="profile-video-thumbnail" muted preload="metadata">
                  <source src={video.fileUrl} type="video/mp4" />
                </video>
                <div className="profile-video-likes-badge">
                  <AiFillHeart style={{ color: "#ff0050" }} /> {video.likes || 0}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Reproductor de Videos del Perfil */}
      {selectedVideo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "450px",
              height: "80vh",
              background: "#000",
              borderRadius: "15px",
              overflow: "hidden",
              border: "1px solid #333"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                color: "white",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10
              }}
              onClick={() => setSelectedVideo(null)}
            >
              <AiOutlineClose style={{ fontSize: "20px" }} />
            </button>

            <video
              src={selectedVideo.fileUrl}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              controls
              autoPlay
              loop
            />
          </div>
        </div>
      )}

      {/* Modal de compra de gemas doradas */}
      {showPurchaseModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }} onClick={() => !isPurchasing && setShowPurchaseModal(false)}>
          <div style={{
            width: "90%",
            maxWidth: "380px",
            background: "#18181c",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            borderRadius: "20px",
            padding: "25px",
            boxShadow: "0 10px 30px rgba(255, 215, 0, 0.15)",
            color: "#fff",
            textAlign: "center"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>
              ✨ Tienda de Gemas Doradas
            </h3>
            <p style={{ fontSize: "13px", color: "#ccc", marginBottom: "20px" }}>
              Adquiere la exclusiva Gema Dorada con dinero real.
            </p>
            
            {isPurchasing ? (
              <div style={{ padding: "30px 0" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid rgba(255,215,0,0.1)",
                  borderTop: "4px solid #FFD700",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 15px auto"
                }} className="secure-spinner"></div>
                <p style={{ color: "#aaa" }}>Procesando pago seguro...</p>
              </div>
            ) : purchaseSuccess ? (
              <div style={{ padding: "20px 0" }}>
                <div style={{ fontSize: "50px", marginBottom: "15px" }}>🎉</div>
                <h4 style={{ color: "#00ff80", fontWeight: "bold", fontSize: "18px", marginBottom: "10px" }}>
                  ¡Compra Exitosa!
                </h4>
                <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>
                  Has recibido {purchasedAmount} Gemas Doradas.
                </p>
                <button
                  onClick={() => {
                    setPurchaseSuccess(false);
                    setShowPurchaseModal(false);
                  }}
                  style={{
                    background: "#ff0050",
                    border: "none",
                    borderRadius: "20px",
                    padding: "10px 25px",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { amount: 10, price: "$0.99 USD" },
                    { amount: 50, price: "$3.99 USD", label: "Ahorra 20%" },
                    { amount: 100, price: "$6.99 USD", label: "Mejor Valor" }
                  ].map((option) => (
                    <div
                      key={option.amount}
                      onClick={() => handleBuyGems(option.amount)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 215, 0, 0.15)",
                        borderRadius: "12px",
                        padding: "12px 15px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      className="purchase-option"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img src={coin6} alt="Gema Dorada" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: "bold", fontSize: "14px" }}>x{option.amount} Gemas</div>
                          {option.label && <span style={{ fontSize: "9px", color: "#FFD700", background: "rgba(255,215,0,0.08)", padding: "1px 5px", borderRadius: "6px", display: "inline-block", marginTop: "2px" }}>{option.label}</span>}
                        </div>
                      </div>
                      <div style={{ fontWeight: "bold", color: "#FFD700" }}>{option.price}</div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  style={{
                    background: "#333",
                    border: "none",
                    borderRadius: "20px",
                    padding: "8px 20px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Seguidores / Seguidos */}
      {showFollowModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }} onClick={() => setShowFollowModal(null)}>
          <div style={{
            width: "90%",
            maxWidth: "360px",
            background: "#18181c",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            color: "#fff"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "15px", textAlign: "center" }}>
              {showFollowModal === "followers" ? "👥 Seguidores" : "👤 Seguidos"}
            </h3>

            {loadingFollowList ? (
              <div style={{ padding: "30px 0", textAlign: "center" }}>
                <div style={{
                  width: "30px",
                  height: "30px",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTop: "3px solid #ff0050",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 10px auto"
                }} className="secure-spinner"></div>
                <p style={{ color: "#aaa", fontSize: "13px" }}>Cargando lista...</p>
              </div>
            ) : followUsersList.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666", padding: "20px 0", fontSize: "13px" }}>
                No hay usuarios para mostrar.
              </p>
            ) : (
              <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px", paddingRight: "5px" }}>
                {followUsersList.map((u) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <img
                      src={u.profilePic || "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"}
                      alt="avatar"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", objectFit: "cover" }}
                      onError={(e) => { e.target.src = "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "bold", fontSize: "13px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.name || u.email?.split("@")[0] || "Usuario de Poptok"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{u.email?.split("@")[0] || "poptok"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowFollowModal(null)}
              style={{
                background: "#ff0050",
                border: "none",
                borderRadius: "20px",
                padding: "8px 20px",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
                fontSize: "13px"
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
