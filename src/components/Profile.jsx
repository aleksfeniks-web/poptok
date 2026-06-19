import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase.js";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { AiFillHeart, AiOutlineClose } from "react-icons/ai";
import { BsAward, BsCoin, BsGrid3X3Gap } from "react-icons/bs";
import { FaUserEdit } from "react-icons/fa";

const Profile = ({ onSelectVideo }) => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

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
        setFollowersCount(Array.isArray(data.followers) ? data.followers.length : 0);
        setFollowingCount(Array.isArray(data.following) ? data.following.length : 0);
      }
    } catch (err) {
      console.error("Error al obtener datos de perfil en Firestore:", err);
    }
  };

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
        paypalEmail: paypalEmail.trim()
      });

      setIsEditing(false);
      alert("✅ ¡Perfil actualizado correctamente!");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("Error al actualizar el perfil.");
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
              <button className="profile-save-button" onClick={handleSaveProfile} style={{ marginTop: "15px" }}>
                Guardar Cambios
              </button>
              <button
                className="profile-save-button"
                style={{ background: "#444", marginTop: "5px" }}
                onClick={() => {
                  setDisplayName(user.displayName || "Creador Poptok");
                  setPaypalEmail(user.paypalEmail || "");
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
              <FaUserEdit
                style={{ fontSize: "16px", cursor: "pointer", color: "#ff0050" }}
                onClick={() => setIsEditing(true)}
              />
            </h2>
            <p className="profile-email-sub">{user.email}</p>
          </>
        )}

        {/* Fila de Estadísticas */}
        <div className="profile-stats-row">
          <div className="profile-stat-item">
            <span className="profile-stat-val coins">
              <BsCoin style={{ verticalAlign: "middle" }} /> {coins}
            </span>
            <span className="profile-stat-lbl">Monedas</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-val" style={{ color: "#ff0080" }}>
              {followersCount}
            </span>
            <span className="profile-stat-lbl">Seguidores</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-val" style={{ color: "#00ff80" }}>
              {followingCount}
            </span>
            <span className="profile-stat-lbl">Seguidos</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-val" style={{ color: "#00ffff" }}>
              <BsGrid3X3Gap style={{ verticalAlign: "middle" }} /> {userVideos.length}
            </span>
            <span className="profile-stat-lbl">Videos</span>
          </div>
        </div>
      </div>

      {/* Videos del Creador */}
      <h3 className="profile-grid-title">Mis Videos</h3>
      {userVideos.length === 0 ? (
        <p className="profile-no-videos">No has subido ningún video todavía. ¡Comparte tu primer video!</p>
      ) : (
        <div className="profile-videos-grid">
          {userVideos.map((video) => (
            <div
              key={video.riuzaki1234}
              className="profile-video-card"
              onClick={() => setSelectedVideo(video)}
            >
              {/* Para simplificar sin servidor de thumbnails, usamos el video directamente silenciado/pausado */}
              <video className="profile-video-thumbnail" muted preload="metadata">
                <source src={video.fileUrl} type="video/mp4" />
              </video>
              <div className="profile-video-likes-badge">
                <AiFillHeart /> {video.likes || 0}
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
};

export default Profile;
