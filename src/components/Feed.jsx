import React, { useEffect, useState, useRef } from "react";
import "../index.css";
import VideoPlayer from "./VideoPlayer.jsx";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, updateDoc, getDoc, getDocs, query, orderBy, limit, increment, arrayUnion, setDoc } from "firebase/firestore";
import { AiFillHeart } from "react-icons/ai";
import { FiSearch, FiVideo } from "react-icons/fi";

// ─── Videos de demostración (Mixkit CDN — sin API key, hotlinking permitido) ──
// Mixkit by Envato — free to use, direct embedding allowed.
// https://mixkit.co/license/
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
  layout = "feed",
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
      setCurrentUser(u || null);
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
    } catch (err) {
      console.error("❌ Error al actualizar monedas:", err);
    }
  };

  const updateVideoComments = async (riuzaki1234, comment, currentUser) => {
    try {
      if (!riuzaki1234 || !comment || !currentUser) return;

      const newComment = {
        commentId: comment.commentId || Date.now().toString(),
        text: comment.text || comment,
        timestamp: comment.timestamp || new Date().toISOString(),
        userId: comment.userId || currentUser.uid,
        username: comment.username || currentUser.displayName || "Anónimo",
      };

      // Solo guardar en Firestore si NO es un video de Pexels
      const video = videos.find(v => v.riuzaki1234 === riuzaki1234);
      if (!video?.isPexels) {
        const videoRef = doc(db, "videos", riuzaki1234);
        await updateDoc(videoRef, { comments: arrayUnion(newComment) });
      }

      setVideos((prevVideos) =>
        prevVideos.map((v) =>
          v.riuzaki1234 === riuzaki1234
            ? { ...v, comments: [...(v.comments || []), newComment] }
            : v
        )
      );

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

  // ✅ Función para cargar videos desde Firestore + fallback a demo
  const fetchVideos = async (currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const videosCollection = collection(db, "videos");
      const q = query(videosCollection, orderBy("createdAt", "desc"), limit(5 * currentPage));
      const querySnapshot = await getDocs(q);

      const firestoreData = querySnapshot.docs.map((doc) => ({
        riuzaki1234: doc.id,
        ...doc.data(),
        comments: Array.isArray(doc.data().comments) ? doc.data().comments : [],
      }));

      console.log("✅ Videos recibidos desde Firestore:", firestoreData);

      // If Firestore is empty → use demo videos, no more pages
      if (firestoreData.length === 0) {
        setHasMore(false);
        // Only set demo videos once (on page 1)
        if (currentPage === 1) {
          setVideos(PEXELS_DEMO_VIDEOS);
          const demoInteractions = {};
          PEXELS_DEMO_VIDEOS.forEach(v => {
            demoInteractions[v.riuzaki1234] = {
              likes: v.likes, comments: 0, favorites: v.favorites, coins: v.coins,
            };
          });
          setInteractions(demoInteractions);
        }
        return;
      }

      // If fewer results than expected → no more pages
      if (firestoreData.length < 5 * currentPage) setHasMore(false);

      // Page 1 → replace; page > 1 → append unique
      if (currentPage === 1) {
        setVideos(firestoreData);
      } else {
        setVideos((prev) => {
          const ids = new Set(prev.map(v => v.riuzaki1234));
          return [...prev, ...firestoreData.filter(v => !ids.has(v.riuzaki1234))];
        });
      }

      // Interactions
      setInteractions((prev) => {
        const next = { ...prev };
        firestoreData.forEach((v) => {
          if (!next[v.riuzaki1234]) {
            next[v.riuzaki1234] = {
              likes: v.likes || 0,
              comments: v.comments?.length || 0,
              favorites: v.favorites || 0,
              coins: v.coins || 0,
            };
          }
        });
        return next;
      });
    } catch (err) {
      setError(err.message);
      // On network error show demo videos
      setHasMore(false);
      setVideos(PEXELS_DEMO_VIDEOS);
      const demoInteractions = {};
      PEXELS_DEMO_VIDEOS.forEach(v => {
        demoInteractions[v.riuzaki1234] = { likes: v.likes, comments: 0, favorites: v.favorites, coins: v.coins };
      });
      setInteractions(demoInteractions);
    } finally {
      setLoading(false);
    }
  };


  // ✅ Cargar videos al iniciar o cambiar paginación
  useEffect(() => {
    if (!isOpen) {
      fetchVideos(page);
    }
  }, [page, refreshTrigger, isOpen]);

  // ✅ Detectar fin de scroll — solo si hay más y no es una carga demo
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore, setPage]);


  // ✅ Función para manejar interacciones (likes, comentarios, favoritos)
  const handleInteraction = async (riuzaki1234, type) => {
    if (!currentUser) return;

    const uid = currentUser.uid;
    if (type === "coins") {
      updateUserCoinsInFirestore(uid);
      return;
    }

    const video = videos.find(v => v.riuzaki1234 === riuzaki1234);

    // Para videos de Pexels solo actualizamos el estado local
    if (!video?.isPexels) {
      try {
        const videoRef = doc(db, "videos", riuzaki1234);
        if (type === "likes") {
          await updateDoc(videoRef, { likes: increment(1) });
        } else if (type === "favorites") {
          await updateDoc(videoRef, { favorites: increment(1) });
        }
      } catch (err) {
        console.error("❌ Error al actualizar interacciones:", err);
      }
    }

    setInteractions((prevInteractions) => ({
      ...prevInteractions,
      [riuzaki1234]: {
        ...prevInteractions[riuzaki1234],
        [type]: (prevInteractions[riuzaki1234]?.[type] || 0) + 1,
      },
    }));
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

  // ─── Empty state component ─────────────────────────────────────────────────
  const EmptyState = ({ message = "¡Sé el primero en subir un video!" }) => (
    <div className="feed-empty-state">
      <div className="feed-empty-icon">
        <FiVideo size={52} />
      </div>
      <h3 className="feed-empty-title">Sin contenido aún</h3>
      <p className="feed-empty-text">{message}</p>
    </div>
  );

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  const LoadingState = () => (
    <div className="feed-loading-state">
      <div className="feed-loading-spinner" />
      <p className="feed-loading-text">Cargando videos...</p>
    </div>
  );

  // ─── EXPLORAR MODE ─────────────────────────────────────────────────────────
  if (layout === "explore") {
    return (
      <div className="explore-container">
        {/* Buscador */}
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

        {/* Categorías */}
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

        {loading && page === 1 ? (
          <LoadingState />
        ) : error ? (
          <p style={{ color: "#ff6b6b", textAlign: "center", padding: "50px 0" }}>Error al cargar: {error}</p>
        ) : filteredVideos.length === 0 ? (
          <EmptyState message="No se encontraron videos en esta categoría." />
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

        {/* Pexels attribution */}
        {videos.some(v => v.isPexels) && (
          <p className="pexels-attribution">
            Videos de muestra proporcionados por{" "}
            <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a>
          </p>
        )}

        <div ref={observerRef} style={{ height: "10px", marginTop: "20px" }} />
        {loading && page > 1 && <p style={{ color: "#aaa", textAlign: "center", padding: "10px" }}>Cargando más...</p>}
      </div>
    );
  }

  // ─── FEED MODE (Snap-scroll vertical) ─────────────────────────────────────
  return (
    <div className="feed-container snap-mode">
      {loading && page === 1 ? (
        <div className="feed-snap-loading">
          <LoadingState />
        </div>
      ) : error && displayVideos.length === 0 ? (
        <div className="feed-snap-loading">
          <EmptyState message="Error al conectar. Por favor revisa tu conexión." />
        </div>
      ) : displayVideos.length === 0 ? (
        <div className="feed-snap-loading">
          <EmptyState />
        </div>
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

      <div ref={observerRef} style={{ height: "10px" }} />
      {loading && page > 1 && <p style={{ color: "#aaa", textAlign: "center", padding: "10px" }}>Cargando más videos...</p>}
      <div style={{ height: "60px" }} />
    </div>
  );
};

export default Feed;
