import React, { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { FiTrash2, FiShield } from "react-icons/fi";

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState("videos"); // "videos" | "users"
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // ─── Fetch Videos ─────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(list);
      setLoadingVideos(false);
    }, (err) => {
      console.error("Error fetching videos for moderation:", err);
      setLoadingVideos(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── Fetch Users ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error fetching users for moderation:", err);
      setLoadingUsers(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── Moderation Handlers ──────────────────────────────────────────────────
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este video permanentemente?")) return;
    try {
      await deleteDoc(doc(db, "videos", videoId));
      alert("✅ Video eliminado correctamente.");
    } catch (err) {
      console.error("Error deleting video:", err);
      alert("Error al eliminar el video: " + err.message);
    }
  };

  const handleUpdateUserStatus = async (userId, newStatus) => {
    const statusMsg = newStatus === "blocked" ? "BLOQUEAR" : newStatus === "restricted" ? "RESTRINGIR" : "ACTIVAR";
    if (!window.confirm(`¿Estás seguro de que deseas ${statusMsg} a este usuario?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      alert(`✅ Estado del usuario actualizado a: ${newStatus}`);
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Error al cambiar estado: " + err.message);
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === "moderator" ? "user" : "moderator";
    const roleMsg = newRole === "moderator" ? "hacer MODERADOR a" : "quitar rol de moderador de";
    if (!window.confirm(`¿Estás seguro de que deseas ${roleMsg} este usuario?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      alert(`✅ Rol del usuario actualizado a: ${newRole}`);
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Error al cambiar rol: " + err.message);
    }
  };

  return (
    <div className="admin-portal-container" style={{
      padding: "20px",
      maxWidth: "1000px",
      margin: "80px auto 80px auto",
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "25px", borderBottom: "1px solid #333", paddingBottom: "15px" }}>
        <FiShield size={28} style={{ color: "#FF0050" }} />
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800" }}>Panel de Moderación Poptok</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("videos")}
          style={{
            flex: 1,
            padding: "12px",
            background: activeTab === "videos" ? "#FF0050" : "rgba(255,255,255,0.05)",
            border: "1px solid " + (activeTab === "videos" ? "#FF0050" : "rgba(255,255,255,0.1)"),
            color: "#fff",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          🎥 Videos ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            flex: 1,
            padding: "12px",
            background: activeTab === "users" ? "#FF0050" : "rgba(255,255,255,0.05)",
            border: "1px solid " + (activeTab === "users" ? "#FF0050" : "rgba(255,255,255,0.1)"),
            color: "#fff",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          👥 Usuarios ({users.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "videos" ? (
        loadingVideos ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>Cargando videos...</p>
        ) : videos.length === 0 ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>No hay videos en la plataforma.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {videos.map(video => (
              <div key={video.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "12px",
                borderRadius: "12px"
              }}>
                {video.fileType === "image" ? (
                  <img src={video.fileUrl} alt="Preview" style={{ width: "50px", height: "70px", objectFit: "cover", borderRadius: "6px" }} />
                ) : (
                  <video src={video.fileUrl} style={{ width: "50px", height: "70px", objectFit: "cover", borderRadius: "6px", backgroundColor: "#000" }} muted />
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {video.description || "(Sin descripción)"}
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                    Por: <strong style={{ color: "#aaa" }}>@{video.username}</strong> | Cat: {video.interest}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#666" }}>
                    Subido el: {video.createdAt ? new Date(video.createdAt).toLocaleString() : "Desconocido"}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteVideo(video.id)}
                  style={{
                    background: "rgba(255,0,80,0.1)",
                    border: "1px solid rgba(255,0,80,0.3)",
                    color: "#ff0050",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                >
                  <FiTrash2 size={14} /> Eliminar
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        loadingUsers ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p style={{ textAlign: "center", color: "#aaa" }}>No hay usuarios registrados.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {users.map(u => (
              <div key={u.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "12px",
                borderRadius: "12px",
                flexWrap: "wrap"
              }}>
                <img
                  src={u.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email?.split("@")[0] || "U")}&background=ff0050&color=fff&bold=true`}
                  alt="Avatar"
                  style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                />

                <div style={{ flex: 1, minWidth: "150px" }}>
                  <h4 style={{ margin: "0 0 2px 0", fontSize: "14px", color: "#fff" }}>
                    {u.name || "Usuario de Poptok"}
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                    {u.email} | Rol: <span style={{ color: u.role === "admin" ? "#f39c12" : u.role === "moderator" ? "#00f2fe" : "#aaa", fontWeight: "bold" }}>{u.role || "user"}</span>
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <span style={{
                      fontSize: "10px",
                      background: u.status === "blocked" ? "rgba(255,0,80,0.15)" : u.status === "restricted" ? "rgba(243,156,18,0.15)" : "rgba(46,204,113,0.15)",
                      color: u.status === "blocked" ? "#ff0050" : u.status === "restricted" ? "#f39c12" : "#2ecc71",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "bold"
                    }}>
                      {u.status === "blocked" ? "🚫 Bloqueado" : u.status === "restricted" ? "⚠️ Restringido" : "✅ Activo"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {u.status !== "active" && (
                    <button
                      onClick={() => handleUpdateUserStatus(u.id, "active")}
                      style={{
                        background: "rgba(46,204,113,0.1)",
                        border: "1px solid rgba(46,204,113,0.3)",
                        color: "#2ecc71",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Activar
                    </button>
                  )}
                  {u.status !== "restricted" && u.role !== "admin" && (
                    <button
                      onClick={() => handleUpdateUserStatus(u.id, "restricted")}
                      style={{
                        background: "rgba(243,156,18,0.1)",
                        border: "1px solid rgba(243,156,18,0.3)",
                        color: "#f39c12",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Restringir
                    </button>
                  )}
                  {u.status !== "blocked" && u.role !== "admin" && (
                    <button
                      onClick={() => handleUpdateUserStatus(u.id, "blocked")}
                      style={{
                        background: "rgba(255,0,80,0.1)",
                        border: "1px solid rgba(255,0,80,0.3)",
                        color: "#ff0050",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      Bloquear
                    </button>
                  )}
                  {u.role !== "admin" && (
                    <button
                      onClick={() => handleToggleUserRole(u.id, u.role)}
                      style={{
                        background: "rgba(0, 242, 254, 0.1)",
                        border: "1px solid rgba(0, 242, 254, 0.3)",
                        color: "#00f2fe",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    >
                      {u.role === "moderator" ? "Quitar Mod" : "Hacer Mod"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminPortal;
