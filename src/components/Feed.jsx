import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";
import VideoPlayer from "./VideoPlayer.jsx";
import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, updateDoc, getDoc, getDocs, query, orderBy, limit, increment, arrayUnion, setDoc, onSnapshot, deleteDoc, where, addDoc } from "firebase/firestore";
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
  userStatus,
  userRole,
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
  setActiveExploreVideoId,
  onVideoPlayStateChange,
  onReactToComment
}) => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  // Escuchar campañas publicitarias activas de tipo in-feed
  useEffect(() => {
    const q = query(
      collection(db, "campaigns"),
      where("status", "==", "active"),
      where("adType", "==", "infeed")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                               .filter(c => c.remainingBudget > 0);
      setCampaigns(list);
    }, (err) => {
      console.error("Error al escuchar campañas:", err);
    });
    return () => unsubscribe();
  }, []);

  const doesCampaignMatchVideo = (campaignTag, videoInterest) => {
    if (!campaignTag || campaignTag === "Random" || campaignTag === "Todos") return true;
    if (campaignTag === videoInterest) return true;
    
    const mappings = {
      "Tecnología & Software": ["Science & Tech", "IA", "Crypto", "Gaming"],
      "Moda & Belleza": ["Lifestyle", "Animals & Pets"],
      "Alimentos & Bebidas": ["Food & Drinks"],
      "Entretenimiento": ["Anime & Manga", "Humor", "Memes", "WTF", "Relationship & Dating", "Movies & TV", "Superhero", "Comic"],
      "Salud & Deporte": ["Sports"],
      "Educación": ["Science & Tech", "Latest News"]
    };
    
    const mapped = mappings[campaignTag];
    if (mapped && mapped.includes(videoInterest)) return true;
    return false;
  };

  const injectAds = (contentVideos) => {
    if (!campaigns || campaigns.length === 0) return contentVideos;
    
    const result = [];
    let adIndex = 0;
    
    for (let i = 0; i < contentVideos.length; i++) {
      result.push(contentVideos[i]);
      
      // Inject an ad every 3 videos
      if ((i + 1) % 3 === 0) {
        const video = contentVideos[i];
        
        // Match campaign with video interest
        let matchingCampaign = campaigns.find(c => doesCampaignMatchVideo(c.tags, video.interest));
        
        // Fallback to any campaign if no match
        if (!matchingCampaign && campaigns.length > 0) {
          matchingCampaign = campaigns[adIndex % campaigns.length];
        }
        
        if (matchingCampaign) {
          result.push({
            riuzaki1234: `ad-${matchingCampaign.id}-${i}`,
            isAd: true,
            adId: matchingCampaign.id,
            username: matchingCampaign.businessName,
            businessName: matchingCampaign.businessName,
            description: matchingCampaign.description || matchingCampaign.title,
            interest: video.interest || "Random",
            fileUrl: matchingCampaign.imageUrl,
            fileType: "image",
            link: matchingCampaign.link,
            likes: 0,
            favorites: 0,
            shares: 0,
            downloads: 0,
            comments: []
          });
          adIndex++;
        }
      }
    }
    return result;
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interactions, setInteractions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeLives, setActiveLives] = useState([]);
  const observerRef = useRef(null);

  // ✅ Escuchar transmisiones en vivo activas en tiempo real
  useEffect(() => {
    const q = query(collection(db, "lives"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveLives(list);
    }, (err) => {
      console.error("Error al escuchar transmisiones activas:", err);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Manejo de autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u || null);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Escuchar en tiempo real los me gusta y favoritos del usuario
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserProfile(snapshot.data());
      }
    }, (err) => {
      console.error("❌ Error al escuchar perfil del usuario en Feed:", err);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const updateUserCoinsInFirestore = async (uid, coinType = 1) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentCoins = data.coins || 0;
        const coinCounts = data.coinCounts || {
          coin_1: currentCoins,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        };

        const key = `coin_${coinType}`;
        coinCounts[key] = (coinCounts[key] || 0) + 1;

        await updateDoc(userRef, { 
          coins: currentCoins + 1,
          coinCounts: coinCounts
        });
      } else {
        const counts = { coin_1: 11, coin_2: 0, coin_3: 0, coin_4: 0, coin_5: 0, coin_6: 0 };
        const key = `coin_${coinType}`;
        counts[key] = (counts[key] || 0) + 1;
        await setDoc(userRef, { 
          coins: 12,
          coinCounts: counts
        }, { merge: true });
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
        likes: comment.likes || [],
        dislikes: comment.dislikes || [],
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

  const handleDeleteVideo = async (videoId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este video permanentemente?")) {
      try {
        const videoRef = doc(db, "videos", videoId);
        await deleteDoc(videoRef);
        setVideos((prev) => prev.filter((v) => v.riuzaki1234 !== videoId));
        alert("Video eliminado correctamente.");
      } catch (err) {
        console.error("❌ Error al eliminar video:", err);
        alert("No se pudo eliminar el video.");
      }
    }
  };

  // ✅ Función para cargar videos desde Firestore + fallback a demo
  const fetchVideos = async (currentPage) => {
    try {
      setLoading(true);
      setError(null);

      const videosCollection = collection(db, "videos");
      const q = query(videosCollection, orderBy("createdAt", "desc"), limit(5 * currentPage));
      
      // Timeout de 8 segundos para evitar que la carga se congele por red inestable o bloqueada
      const querySnapshot = await Promise.race([
        getDocs(q),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado")), 8000))
      ]);

      const firestoreData = querySnapshot.docs.map((doc) => ({
        riuzaki1234: doc.id,
        ...doc.data(),
        comments: Array.isArray(doc.data().comments) ? doc.data().comments : [],
      }));


      // If Firestore is empty → use demo videos, no more pages
      if (firestoreData.length === 0) {
        setHasMore(false);
        // Only set demo videos once (on page 1)
        if (currentPage === 1) {
          setVideos(PEXELS_DEMO_VIDEOS);
          const demoInteractions = {};
          PEXELS_DEMO_VIDEOS.forEach(v => {
            demoInteractions[v.riuzaki1234] = {
              likes: v.likes, comments: 0, favorites: v.favorites, coins: v.coins, shares: 0, downloads: 0
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
              shares: v.shares || 0,
              downloads: v.downloads || 0,
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
        demoInteractions[v.riuzaki1234] = { likes: v.likes, comments: 0, favorites: v.favorites, coins: v.coins, shares: 0, downloads: 0 };
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


  // ✅ Función para manejar interacciones (likes, comentarios, favoritos, compartidos, descargas)
  const handleInteraction = async (riuzaki1234, type, extra) => {
    if (type === "coins") {
      if (!currentUser) return;
      updateUserCoinsInFirestore(currentUser.uid, extra);
      return;
    }

    const video = videos.find(v => v.riuzaki1234 === riuzaki1234);

    try {
      if (type === "likes") {
        if (!currentUser) return;
        const userRef = doc(db, "users", currentUser.uid);
        if (userProfile?.likedVideos?.includes(riuzaki1234)) return;

        await updateDoc(userRef, {
          likedVideos: arrayUnion(riuzaki1234)
        });

        if (video && !video.isPexels) {
          const videoRef = doc(db, "videos", riuzaki1234);
          await updateDoc(videoRef, { likes: increment(1) });
          
          if (video.userId && video.userId !== currentUser.uid) {
            await addDoc(collection(db, "activity_notifications"), {
              userId: video.userId,
              type: "like",
              senderId: currentUser.uid,
              senderName: currentUser.displayName || currentUser.email || "Usuario de Poptok",
              videoId: riuzaki1234,
              videoTitle: video.description || "",
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
      } else if (type === "favorites") {
        if (!currentUser) return;
        const userRef = doc(db, "users", currentUser.uid);
        if (userProfile?.favorites?.includes(riuzaki1234)) return;

        await updateDoc(userRef, {
          favorites: arrayUnion(riuzaki1234)
        });

        if (video && !video.isPexels) {
          const videoRef = doc(db, "videos", riuzaki1234);
          await updateDoc(videoRef, { favorites: increment(1) });
          
          if (video.userId && video.userId !== currentUser.uid) {
            await addDoc(collection(db, "activity_notifications"), {
              userId: video.userId,
              type: "favorite",
              senderId: currentUser.uid,
              senderName: currentUser.displayName || currentUser.email || "Usuario de Poptok",
              videoId: riuzaki1234,
              videoTitle: video.description || "",
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
      } else if (type === "shares") {
        if (video && !video.isPexels) {
          const videoRef = doc(db, "videos", riuzaki1234);
          await updateDoc(videoRef, { shares: increment(1) });
          
          if (currentUser && video.userId && video.userId !== currentUser.uid) {
            await addDoc(collection(db, "activity_notifications"), {
              userId: video.userId,
              type: "share",
              senderId: currentUser.uid,
              senderName: currentUser.displayName || currentUser.email || "Usuario de Poptok",
              videoId: riuzaki1234,
              videoTitle: video.description || "",
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
      } else if (type === "downloads") {
        if (video && !video.isPexels) {
          const videoRef = doc(db, "videos", riuzaki1234);
          await updateDoc(videoRef, { downloads: increment(1) });
          
          if (currentUser && video.userId && video.userId !== currentUser.uid) {
            await addDoc(collection(db, "activity_notifications"), {
              userId: video.userId,
              type: "download",
              senderId: currentUser.uid,
              senderName: currentUser.displayName || currentUser.email || "Usuario de Poptok",
              videoId: riuzaki1234,
              videoTitle: video.description || "",
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
      }
    } catch (err) {
      console.error(`❌ Error al actualizar interacción (${type}):`, err);
    }

    setInteractions((prevInteractions) => ({
      ...prevInteractions,
      [riuzaki1234]: {
        ...prevInteractions[riuzaki1234],
        [type]: (prevInteractions[riuzaki1234]?.[type] || 0) + 1,
      },
    }));
  };

  const CATEGORY_MAP = {
    "All": "Todos",
    "Random": "Aleatorio",
    "Anime & Manga": "Anime y Manga",
    "Latest News": "Noticias",
    "Humor": "Humor",
    "Memes": "Memes",
    "Gaming": "Videojuegos",
    "WTF": "Qué Loco",
    "Relationship & Dating": "Relaciones y Citas",
    "Motor Vehicles": "Autos y Motos",
    "Animals & Pets": "Animales y Mascotas",
    "Science & Tech": "Ciencia y Tecnología",
    "ASMR": "ASMR",
    "Sports": "Deportes",
    "Movies & TV": "Cine y TV",
    "Food & Drinks": "Comida y Bebida",
    "Lifestyle": "Estilo de Vida",
    "Superhero": "Superhéroes",
    "Crypto": "Cripto",
    "IA": "Inteligencia Artificial",
    "WoW": "¡Wow!",
    "Comic": "Cómics",
    "Wholesome": "Tierno",
    "Cat": "Gatos"
  };

  const categories = [
    "All", "Random", "Anime & Manga", "Latest News", "Humor", "Memes", "Gaming",
    "WTF", "Relationship & Dating", "Motor Vehicles", "Animals & Pets",
    "Science & Tech", "ASMR", "Sports", "Movies & TV", "Food & Drinks",
    "Lifestyle", "Superhero", "Crypto", "IA", "WoW"
  ];

  const filteredVideos = videos.filter((v) => {
    // Ocultar videos de usuarios bloqueados
    if (userProfile?.blockedUsers?.includes(v.userId)) {
      return false;
    }

    const matchesSearch = searchQuery.trim() === "" ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.username && v.username.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // En Todos ("All") no cargues los videos de pexels, solo los subidos por usuarios a poptok
    // A menos que solo existan videos de demostración (es decir, no hay videos reales subidos aún)
    const hasRealVideos = videos.some(video => !video.isPexels);
    const matchesCategory = selectedCategory === "All"
      ? (hasRealVideos ? !v.isPexels : true)
      : v.interest === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const liveItems = layout === "feed" ? activeLives
    .filter(live => {
      const matchesSearch = searchQuery.trim() === "" ||
        (live.title && live.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (live.hostName && live.hostName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || live.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .map(live => ({
      riuzaki1234: live.roomId,
      isLive: true,
      username: live.hostName,
      userPhotoURL: live.hostPhoto,
      description: live.title,
      interest: live.category,
      userId: live.hostId,
      likes: live.likes || 0,
      viewers: live.viewersCount || 0,
      pinnedProduct: live.pinnedProduct || null
    })) : [];

  const baseVideos = activeExploreVideoId
    ? [
        ...filteredVideos.filter(v => v.riuzaki1234 === activeExploreVideoId),
        ...filteredVideos.filter(v => v.riuzaki1234 !== activeExploreVideoId)
      ]
    : filteredVideos;

  const baseVideosWithAds = injectAds(baseVideos);

  const displayVideos = activeExploreVideoId
    ? [
        ...baseVideosWithAds.slice(0, 1),
        ...liveItems,
        ...baseVideosWithAds.slice(1)
      ]
    : [
        ...liveItems,
        ...baseVideosWithAds
      ];

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
              className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_MAP[cat] || cat}
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
                  <video className="rednote-thumbnail" muted preload="metadata" playsInline>
                    <source src={`${v.fileUrl}#t=0.1`} type="video/mp4" />
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Active Lives Horizontal Bar */}
      {layout === "feed" && activeLives.length > 0 && (
        <div style={{
          position: "absolute",
          top: "0px",
          left: "0",
          right: "0",
          height: "85px",
          zIndex: 100,
          display: "flex",
          gap: "15px",
          padding: "10px 20px",
          overflowX: "auto",
          scrollbarWidth: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.05)"
        }} className="active-lives-bar-container">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {activeLives.map((live) => (
              <div
                key={live.roomId}
                onClick={() => navigate(`/live/${live.roomId}`)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  flexShrink: 0
                }}
              >
                <div style={{
                  position: "relative",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  padding: "2px",
                  background: "linear-gradient(45deg, #ff0050, #ff00ff)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 0 12px rgba(255, 0, 80, 0.6)",
                  animation: "pulse-ring 2s infinite"
                }}>
                  <img
                    src={live.hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(live.hostName)}&background=ff0050&color=fff&bold=true`}
                    alt={live.hostName}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #000"
                    }}
                  />
                  <span style={{
                    position: "absolute",
                    bottom: "-4px",
                    background: "#FF0050",
                    color: "white",
                    fontSize: "8px",
                    fontWeight: "extrabold",
                    padding: "1px 4px",
                    borderRadius: "4px",
                    letterSpacing: "0.5px"
                  }}>
                    LIVE
                  </span>
                </div>
                <span style={{
                  fontSize: "9px",
                  color: "#eee",
                  marginTop: "6px",
                  maxWidth: "55px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textShadow: "0 1px 2px rgba(0,0,0,0.8)"
                }}>
                  @{live.hostName}
                </span>
              </div>
            ))}
          </div>

          <style>{`
            .active-lives-bar-container::-webkit-scrollbar {
              display: none;
            }
            @keyframes pulse-ring {
              0% { box-shadow: 0 0 0 0px rgba(255, 0, 80, 0.6); }
              70% { box-shadow: 0 0 0 6px rgba(255, 0, 80, 0); }
              100% { box-shadow: 0 0 0 0px rgba(255, 0, 80, 0); }
            }
          `}</style>
        </div>
      )}

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
          displayVideos.map((v) => {
            if (v.isLive) {
              return (
                <div key={v.riuzaki1234} className="video-item" style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  background: "radial-gradient(circle, #2a081a 0%, #000000 100%)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "white"
                }}>
                  {/* HUD superior del live en feed */}
                  <div style={{
                    position: "absolute",
                    top: "100px",
                    left: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    zIndex: 5
                  }}>
                    <span style={{
                      background: "#FF0050",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      letterSpacing: "1px"
                    }}>
                      🔴 EN VIVO
                    </span>
                    <span style={{
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px"
                    }}>
                      👥 {v.viewers} espectando
                    </span>
                  </div>

                  {/* Avatar pulsante del creador */}
                  <div style={{
                    position: "relative",
                    width: "110px",
                    height: "110px",
                    marginBottom: "18px"
                  }}>
                    <div style={{
                      position: "absolute",
                      inset: "-6px",
                      borderRadius: "50%",
                      border: "3px solid #ff0050",
                      animation: "ping-glow 2s infinite ease-out"
                    }} />
                    <img
                      src={v.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.username)}&background=ff0050&color=fff&bold=true`}
                      alt={v.username}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #000",
                        boxShadow: "0 0 20px rgba(255, 0, 80, 0.4)"
                      }}
                    />
                  </div>

                  {/* Info del Live */}
                  <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "6px", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                    @{v.username}
                  </h3>
                  <p style={{
                    fontSize: "14px",
                    color: "#ddd",
                    textAlign: "center",
                    maxWidth: "80%",
                    lineHeight: "1.4",
                    marginBottom: "20px",
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)"
                  }}>
                    {v.description || "¡Transmisión en Vivo! Únete para interactuar."}
                  </p>

                  {/* Categoría */}
                  {v.interest && (
                    <span style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "15px",
                      padding: "4px 12px",
                      fontSize: "12px",
                      color: "#00f2fe",
                      marginBottom: "25px",
                      fontWeight: "bold"
                    }}>
                      🏷️ {CATEGORY_MAP[v.interest] || v.interest}
                    </span>
                  )}

                  {/* Botón de acción para unirse */}
                  <button
                    onClick={() => navigate(`/live/${v.riuzaki1234}`)}
                    style={{
                      background: "linear-gradient(135deg, #ff0050, #ff00ff)",
                      color: "white",
                      border: "none",
                      borderRadius: "30px",
                      padding: "12px 32px",
                      fontSize: "15px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      boxShadow: "0 8px 20px rgba(255, 0, 80, 0.5)",
                      transition: "transform 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    Unirse al En Vivo
                  </button>

                  <style>{`
                    @keyframes ping-glow {
                      0% { transform: scale(0.95); opacity: 1; }
                      70% { transform: scale(1.15); opacity: 0.4; }
                      100% { transform: scale(1.2); opacity: 0; }
                    }
                  `}</style>
                </div>
              );
            }

            return (
              <div key={v.riuzaki1234} className="video-item">
                <VideoPlayer
                  fileType={v.fileType || "video"}
                  videoUrl={v.fileUrl}
                  username={v.username}
                  description={v.description}
                  interest={v.interest}
                  riuzaki1234={v.riuzaki1234}
                  currentUser={currentUser}
                  userProfile={userProfile}
                  userId={v.userId}
                  userStatus={userStatus}
                  userPhotoURL={v.userPhotoURL}
                  musicUrl={v.musicUrl}
                  musicTitle={v.musicTitle}
                  allowDownload={v.allowDownload}
                  interactions={
                    interactions[v.riuzaki1234] || {
                      likes: v.likes || 0,
                      comments: [],
                      favorites: v.favorites || 0,
                      coins: v.coins || 0,
                      shares: v.shares || 0,
                      downloads: v.downloads || 0,
                    }
                  }
                  onInteraction={handleInteraction}
                  isOpen={isOpen}
                  setIsOpen={setIsOpen}
                  updateVideoComments={updateVideoComments}
                  onVideoPlayStateChange={onVideoPlayStateChange}
                  onReactToComment={onReactToComment}
                  reactionComment={v.reactionComment}
                  subtitles={v.subtitles}
                  onDeleteVideo={handleDeleteVideo}
                  userRole={userRole}
                />
              </div>
            );
          })
        )}
      </div>

      <div ref={observerRef} style={{ height: "10px" }} />
      {loading && page > 1 && <p style={{ color: "#aaa", textAlign: "center", padding: "10px" }}>Cargando más videos...</p>}
      <div style={{ height: "60px" }} />
    </div>
  );
};

export default Feed;
