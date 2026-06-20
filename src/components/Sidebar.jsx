import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase.js";
import { collection, getDocs } from "firebase/firestore";
import { toggleFollow, getFollowingList } from "../utils/follow.js";
import { saveScore } from "../utils/saveScore.js";
import PrivacyPolicy from "./PrivacyPolicy.jsx";
import Copyright from "./Copyright.jsx";
import Game from "./Game.jsx";
import coin6 from "../assets/coin_6.svg";

const Sidebar = ({ isOpen, onClose, coins, setCoins }) => {
  const [showContent, setShowContent] = useState("profile"); // "profile", "privacy", "copyright", "explore"
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]); // Lista de usuarios en Firestore
  const [following, setFollowing] = useState([]); // Lista de usuarios seguidos
  const [uid, setUid] = useState(null);
  const [startGame, setStartGame] = useState(false);

  const handleCloseGame = () => { 
    setStartGame(false); 
  };

  // ✅ Obtener usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        setUid(u.uid);
        try {
          const followingList = await getFollowingList();
          setFollowing(followingList);
        } catch (err) {
          console.error("Error fetching following list in sidebar:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ Obtener lista de usuarios en Firestore
  useEffect(() => {
    if (isOpen && users.length === 0) {
      const fetchUsers = async () => {
        try {
          const usersCollection = collection(db, "users");
          const snapshot = await getDocs(usersCollection);
          setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
          console.error("Error fetching users list in sidebar:", err);
        }
      };
      fetchUsers();
    }
  }, [isOpen, users.length]);

  const handleClose = () => {
    setShowContent("profile"); // Siempre vuelve al perfil cuando se cierra
    onClose();
  };

  return (
    <div className={`sidebar-overlay ${isOpen ? "active" : ""}`} onClick={handleClose}>
      <div
        className={`sidebar ${isOpen ? "active" : ""} ${showContent !== "profile" ? "expanded" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sección de perfil */}
        {showContent === "profile" && (
          <>
            <div className="profile-section">
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || user?.email?.split("@")[0] || "Usuario")}&background=ff0050&color=fff&bold=true`} alt="Usuario" className="profile-image" />
              <h3 className="profile-name">{user?.displayName || user?.email || "Usuario"}</h3>
              <div className="coin-count-sidebar" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", margin: "10px 0" }}>
                <img src={coin6} alt="Gema" className="rotating-gem" 
                  style={{
                    width: "20px",
                    height: "20px",
                    "--glow-color": "#fbbf24",
                    border: "none",
                    borderRadius: "0",
                    background: "none",
                    boxShadow: "none"
                  }} />
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>{coins} Gemas</span>
              </div>

              {!startGame ? (
                <div className="start-screen" style={{ marginTop: "15px", cursor: "pointer" }}>
                  <img
                    src="https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/game.gif" 
                    alt="Iniciar Juego"
                    className="start-button"
                    style={{ width: "100%", borderRadius: "10px", maxHeight: "150px", objectFit: "cover" }}
                    onClick={() => setStartGame(true)} 
                  />
                  <p style={{ fontSize: "12px", color: "#aaa", marginTop: "5px" }}>👉 Haz clic en la consola para iniciar el minijuego.</p>
                </div>
              ) : (
                <Game
                  coins={coins}
                  setCoins={setCoins}
                  uid={uid}
                  saveScore={saveScore}
                  onCloseGame={handleCloseGame} 
                />
              )}
            </div>

            {/* Botones de navegación de la Sidebar (Juego, Amigos, Buscar) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px", width: "100%" }}>
              <button
                onClick={() => setShowContent("friends")}
                className="sidebar-button"
                style={{
                  width: "100%",
                  background: "linear-gradient(45deg, #00f2fe, #4facfe)",
                  border: "none",
                  color: "black",
                  padding: "10px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                👥 Mis Amigos
              </button>

              <button
                onClick={() => setShowContent("explore")}
                className="sidebar-button"
                style={{
                  width: "100%",
                  background: "#FF0050",
                  border: "none",
                  color: "white",
                  padding: "10px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                🔍 Buscar Amigos
              </button>
            </div>

            <div className="sidebar-links" style={{ marginTop: "auto", padding: "20px 0" }}>
              <p onClick={() => setShowContent("privacy")} style={{ cursor: "pointer", color: "#888", fontSize: "12px", textAlign: "center" }}>
                Política de privacidad
              </p>
              <p onClick={() => setShowContent("copyright")} style={{ cursor: "pointer", color: "#888", fontSize: "12px", textAlign: "center", marginTop: "10px" }}>
                Protección de derechos
              </p>
            </div>
          </>
        )}

        {/* Sección de Mis Amigos */}
        {showContent === "friends" && (
          <>
            <button onClick={() => setShowContent("profile")} className="back-button" style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", marginBottom: "15px", width: "fit-content" }}>
              ← Atrás
            </button>
            <h3>Mis Amigos</h3>
            <ul className="user-list" style={{ listStyle: "none", padding: 0, overflowY: "auto", flex: 1, marginTop: "10px" }}>
              {users.filter(u => following.includes(u.id)).length === 0 ? (
                <p style={{ color: "#777", fontSize: "13px", textAlign: "center", marginTop: "20px" }}>
                  Aún no tienes amigos agregados.<br/>¡Busca usuarios y agrégalos!
                </p>
              ) : (
                users.filter(u => following.includes(u.id)).map((u) => (
                  <li key={u.id} className="user-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #333" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img 
                        src={u.profilePic || u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email?.split("@")[0] || "U")}&background=ff0050&color=fff&bold=true`} 
                        alt="avatar" 
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} 
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
                          {u.name || u.email?.split("@")[0] || "Usuario"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "#888" }}>
                            @{u.email?.split("@")[0] || "poptok"}
                          </span>
                          {u.following?.includes(uid) && (
                            <span style={{ fontSize: "9px", background: "rgba(0, 242, 254, 0.15)", color: "#00f2fe", padding: "1px 5px", borderRadius: "4px", marginLeft: "6px", fontWeight: "bold" }}>
                              Mutual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className="unfollow-button"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "#ccc",
                        border: "1px solid rgba(255,255,255,0.15)",
                        padding: "4px 10px",
                        borderRadius: "15px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                      onClick={async () => {
                        const updated = await toggleFollow(u.id);
                        if (updated !== undefined) {
                          setFollowing(following.filter(id => id !== u.id));
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        {/* Sección para explorar y seguir usuarios */}
        {showContent === "explore" && (
          <>
            <button onClick={() => setShowContent("profile")} className="back-button" style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", padding: "6px 12px", borderRadius: "15px", cursor: "pointer", marginBottom: "15px", width: "fit-content" }}>
              ← Atrás
            </button>
            <h3>Buscar Amigos</h3>
            <ul className="user-list" style={{ listStyle: "none", padding: 0, overflowY: "auto", flex: 1, marginTop: "10px" }}>
              {users.length === 0 ? (
                <p style={{ color: "#777", fontSize: "13px" }}>No hay otros usuarios registrados.</p>
              ) : (
                users.map((u) => (
                  <li key={u.id} className="user-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #333" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img 
                        src={u.profilePic || u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email?.split("@")[0] || "U")}&background=ff0050&color=fff&bold=true`} 
                        alt="avatar" 
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} 
                      />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
                          {u.name || u.email?.split("@")[0] || "Usuario"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "#888" }}>
                            @{u.email?.split("@")[0] || "poptok"}
                          </span>
                          {u.following?.includes(uid) && (
                            <span style={{ fontSize: "9px", background: "rgba(0, 242, 254, 0.15)", color: "#00f2fe", padding: "1px 5px", borderRadius: "4px", marginLeft: "6px", fontWeight: "bold" }}>
                              Mutual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className={following.includes(u.id) ? "unfollow-button" : "follow-button"}
                      style={{
                        background: following.includes(u.id) ? "#444" : "#FF0050",
                        color: "white",
                        border: "none",
                        padding: "4px 10px",
                        borderRadius: "15px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                      onClick={async () => {
                        const updated = await toggleFollow(u.id);
                        if (updated !== undefined) {
                          setFollowing(updated ? [...following, u.id] : following.filter(id => id !== u.id));
                        }
                      }}
                    >
                      {following.includes(u.id) ? "Eliminar" : "Agregar"}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        {/* Sección de Política de Privacidad */}
        {showContent === "privacy" && <PrivacyPolicy onBack={() => setShowContent("profile")} />}

        {/* Sección de Protección de Derechos */}
        {showContent === "copyright" && <Copyright onBack={() => setShowContent("profile")} />}
      </div>
    </div>
  );
};

export default Sidebar;
