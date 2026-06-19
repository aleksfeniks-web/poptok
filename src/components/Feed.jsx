import React, { useEffect, useState, useRef } from "react";
import "../index.css";
import VideoPlayer from "./VideoPlayer.jsx";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, updateDoc, getDoc, getDocs, query, orderBy, limit, increment, arrayUnion, setDoc } from "firebase/firestore";
import { AiFillHeart } from "react-icons/ai";
import { FiSearch } from "react-icons/fi";

const Feed = ({
  user,
  coins,
  setCoins,
  showUploadSection,
  setShowUploadSection,
  refreshTrigger,
  page,
  setPage,
  isOpen,
  setIsOpen, 
  layout = "feed", // "feed" o "explore"
  onSelectExploreVideo,
  activeExploreVideoId,
  setActiveExploreVideoId
}) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interactions, setInteractions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const observerRef = useRef(null);

  // ✅ Manejo de autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateUserCoinsInFirestore = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCoins = userSnap.data().coins || 0;
        await updateDoc(userRef, { coins: currentCoins + 1 });
      } else {
        await setDoc(userRef, { coins: 11 }, { merge: true });
      }
      console.log("✅ Monedas actualizadas correctamente en Firestore");
    } catch (err) {
      console.error("❌ Error al actualizar monedas:", err);
    }
  };

  const updateVideoComments = async (riuzaki1234, comment, currentUser) => {
    try {
      if (!riuzaki1234 || !comment || !currentUser) {
        throw new Error("Faltan datos requeridos: riuzaki1234, comment o currentUser");
      }

      const newComment = {
        commentId: comment.commentId || Date.now().toString(),
        text: comment.text || comment,  
        timestamp: comment.timestamp || new Date().toISOString(),
        userId: comment.userId || currentUser.uid,
        username: comment.username || currentUser.displayName || "Anónimo",
      };
    
      const videoRef = doc(db, "videos", riuzaki1234);
      await updateDoc(videoRef, {
        comments: arrayUnion(newComment)
      });

      console.log("✅ Comentario guardado en Firestore!");
      
      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          v.riuzaki1234 === riuzaki1234
            ? { ...v, comments: [...(v.comments || []), newComment] }
            : v
        )
      );

      // Actualizar contador local de comentarios
      setInteractions((prevInteractions) => ({
        ...prevInteractions,
        [riuzaki1234]: {
          ...prevInteractions[riuzaki1234],
          comments: (prevInteractions[riuzaki1234]?.comments || 0) + 1
        }
      }));
    } catch (err) {
      console.error("❌ Error en updateVideoComments:", err);
    }
  };

  // ✅ Función para cargar videos con sus comentarios desde Firestore
  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const videosCollection = collection(db, "videos");
      const q = query(videosCollection, orderBy("createdAt", "desc"), limit(5 * page));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map((doc) => ({
        riuzaki1234: doc.id,
        ...doc.data(),
        comments: Array.isArray(doc.data().comments) ? doc.data().comments : [],
      }));

      console.log("✅ Videos recibidos desde Firestore:", data);

      if (data.length === 0 || data.length < 5 * page) {
        setHasMore(false);
      }

      // Append new videos (and prevent duplicating if they are already loaded)
      setVideos((prevVideos) => {
        const existingIds = new Set(prevVideos.map(v => v.riuzaki1234));
        const filteredNew = data.filter(v => !existingIds.has(v.riuzaki1234));
        return [...prevVideos, ...filteredNew];
      });

      // Cargar interacciones
      setInteractions((prevInteractions) => {
        const newInteractions = { ...prevInteractions };
        data.forEach((v) => {
          if (v.riuzaki1234 && !newInteractions[v.riuzaki1234]) {
            newInteractions[v.riuzaki1234] = {
              likes: v.likes || 0,
              comments: v.comments.length, 
              favorites: v.favorites || 0,
              coins: v.coins || 0,
            };
          }
        });
        return newInteractions;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cargar videos al iniciar o cambiar paginación
  useEffect(() => {
    if (!isOpen) {
      fetchVideos();
    }
  }, [page, refreshTrigger, isOpen]);

  // ✅ Detectar fin de scroll para carga automática
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore, setPage]);

  // ✅ Función para manejar interacciones (likes, comentarios, favoritos)
  const handleInteraction = async (riuzaki1234, type) => {
    if (!currentUser) {
      console.error("Usuario no autenticado");
      return;
    }

    const uid = currentUser.uid;
    if (type === "coins") {
      updateUserCoinsInFirestore(uid);
      return;
    }

    try {
      const videoRef = doc(db, "videos", riuzaki1234);
      if (type === "likes") {
        await updateDoc(videoRef, {
          likes: increment(1)
        });
      } else if (type === "favorites") {
        await updateDoc(videoRef, {
          favorites: increment(1)
        });
      }

      setInteractions((prevInteractions) => ({
        ...prevInteractions,
        [riuzaki1234]: {
          ...prevInteractions[riuzaki1234],
          [type]: (prevInteractions[riuzaki1234]?.[type] || 0) + 1,
        },
      }));
      console.log(`✅ Interacción ${type} actualizada en Firestore`);
    } catch (err) {
      console.error("❌ Error al actualizar interacciones:", err);
    }
  };

  const categories = [
    "All", "Random", "Anime & Manga", "Latest News", "Humor", "Memes", "Gaming",
    "WTF", "Relationship & Dating", "Motor Vehicles", "Animals & Pets",
    "Science & Tech", "ASMR", "Sports", "Movies & TV", "Food & Drinks",
    "Lifestyle", "Superhero", "Crypto", "IA", "WoW"
  ];

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = searchQuery.trim() === "" ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.username && v.username.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "" || selectedCategory === "All" || v.interest === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const displayVideos = activeExploreVideoId
    ? [
        ...filteredVideos.filter(v => v.riuzaki1234 === activeExploreVideoId),
        ...filteredVideos.filter(v => v.riuzaki1234 !== activeExploreVideoId)
      ]
    : filteredVideos;

  if (layout === "explore") {
    return (
      <div className="explore-container">
        {/* Explorador de Categorías y Buscador */}
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar videos o creadores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-pill ${selectedCategory === cat || (cat === "All" && selectedCategory === "") ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat === "All" ? "" : cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && page === 1 && <p style={{ color: "#aaa", textAlign: "center" }}>Cargando exploración...</p>}
        {error && <p style={{ color: "red", textAlign: "center" }}>{`Error: ${error}`}</p>}

        {filteredVideos.length === 0 && !loading ? (
          <p style={{ color: "#666", textAlign: "center", padding: "50px 0" }}>No se encontraron videos en esta categoría.</p>
        ) : (
          <div className="rednote-grid">
            {filteredVideos.map((v) => (
              <div
                key={v.riuzaki1234}
                className="rednote-card"
                onClick={() => onSelectExploreVideo(v.riuzaki1234)}
              >
                <div className="rednote-thumbnail-wrapper">
                  <span className="rednote-tag-badge">{v.interest || "Random"}</span>
                  <video className="rednote-thumbnail" muted preload="metadata">
                    <source src={v.fileUrl} type="video/mp4" />
                  </video>
                  <div className="rednote-play-icon">▶</div>
                </div>
                <div className="rednote-card-info">
                  <span className="rednote-card-description">{v.description || "Sin descripción"}</span>
                  <div className="rednote-card-footer">
                    <span className="rednote-card-author">
                      <span className="rednote-author-dot"></span>
                      {v.username || "Creador"}
                    </span>
                    <span className="rednote-card-likes">
                      <AiFillHeart style={{ color: "#ff0050" }} /> {interactions[v.riuzaki1234]?.likes || v.likes || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carga automática */}
        <div ref={observerRef} style={{ height: "10px", marginTop: "20px" }}></div>
        {loading && page > 1 && <p style={{ color: "#aaa", textAlign: "center", padding: "10px" }}>Cargando más...</p>}
      </div>
    );
  }

  // Layout = "feed" (TikTok Scroll Snap)
  return (
    <div className="feed-container snap-mode">
      {loading && page === 1 && <p className="text-center text-gray-400" style={{ padding: "20px" }}>Cargando videos...</p>}
      {error && <p className="text-center text-red-500" style={{ padding: "20px" }}>{`Error: ${error}`}</p>}

      {displayVideos.length === 0 && !loading ? (
        <p className="text-center text-gray-400" style={{ padding: "50px 20px" }}>No hay videos aún. ¡Sé el primero en subir uno!</p>
      ) : (
        displayVideos.map((v) => (
          <div key={v.riuzaki1234} className="video-item">
            <VideoPlayer
              videoUrl={v.fileUrl}
              username={v.username}
              description={v.description}  
              interest={v.interest}  
              riuzaki1234={v.riuzaki1234}
              currentUser={currentUser}
              userId={v.userId}
              interactions={
                interactions[v.riuzaki1234] || {
                  likes: v.likes || 0,
                  comments: [],
                  favorites: v.favorites || 0,
                  coins: v.coins || 0,
                }
              }
              onInteraction={handleInteraction}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              updateVideoComments={updateVideoComments}
            />
          </div>
        ))
      )}

      <div ref={observerRef} style={{ height: "10px" }}></div>
      {loading && page > 1 && <p className="text-center text-gray-400" style={{ padding: "10px" }}>Cargando más videos...</p>}
      <div style={{ height: "60px" }}></div>
    </div>
  );
};

export default Feed;
