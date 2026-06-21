import React, { forwardRef, useState, useEffect, useRef } from "react";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment } from "react-icons/ai";
import { BsStar, BsStarFill } from "react-icons/bs";
import { FaCirclePlus } from "react-icons/fa6";
import { FiShare2, FiDownload, FiTrash2 } from "react-icons/fi";
import Comments from "./Comments.jsx";
import { toggleFollow, getFollowingList } from "../utils/follow.js";
import { db } from "../firebase.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { 
  FaGamepad, FaCat, FaCar, FaFlask, FaFilm, FaUtensils, FaLaugh, 
  FaHeart, FaMusic, FaRobot, FaBolt, FaGlobe, FaBitcoin, FaRandom, 
  FaNewspaper, FaFutbol, FaSuperpowers, FaFireAlt, FaStar, FaPaw, FaPaypal,
  FaPlay, FaPause, FaInstagram, FaTwitter, FaYoutube, FaExternalLinkAlt
} from "react-icons/fa";

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


const coinGlowColors = {
  1: "#ff4a9a", // Pink
  2: "#ff8224", // Orange
  3: "#10b981", // Green
  4: "#8b5cf6", // Purple
  5: "#3b82f6", // Blue
  6: "#fbbf24"  // Gold
};

const VideoPlayer = forwardRef(
  ({ videoUrl, username, riuzaki1234, interactions, onInteraction, uid, currentUser, userProfile, userId, userPhotoURL, commentsList, updateVideoComments, description, interest, musicUrl, musicTitle, allowDownload, onVideoPlayStateChange, onReactToComment, reactionComment, subtitles, onDeleteVideo }, ref) => {
    const [hasError, setHasError] = useState(false);
    const [showCoin, setShowCoin] = useState(false);
    const [spawnedCoinType, setSpawnedCoinType] = useState(1);
    const [coinPosition, setCoinPosition] = useState({ x: 0, y: 0 });
    const [velocity, setVelocity] = useState({ dx: 1, dy: 1 });
    const videoRef = useRef(null);
    const [hasLiked, setHasLiked] = useState(false);
    const [hasFavorited, setHasFavorited] = useState(false);
    const [floatingHearts, setFloatingHearts] = useState([]);
    const [floatingSparks, setFloatingSparks] = useState([]);
    const [showComments, setShowComments] = useState(false);

    // ✅ Sincronizar estado de Me Gusta y Favoritos con el perfil del usuario
    useEffect(() => {
      if (userProfile) {
        setHasLiked(userProfile.likedVideos?.includes(riuzaki1234) || false);
        setHasFavorited(userProfile.favorites?.includes(riuzaki1234) || false);
      } else {
        setHasLiked(false);
        setHasFavorited(false);
      }
    }, [userProfile, riuzaki1234]);
    const [isVertical, setIsVertical] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const defaultUserImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "U")}&background=ff0050&color=fff&bold=true`; 
    const [showDonateButton, setShowDonateButton] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(null); // "play" | "pause" | null
    const [creatorPaypal, setCreatorPaypal] = useState("");
    const [creatorPhotoURL, setCreatorPhotoURL] = useState("");
    const [showLinksModal, setShowLinksModal] = useState(false);
    const [creatorLinks, setCreatorLinks] = useState({ instagram: "", twitter: "", youtube: "", custom: "" });
    const [downloading, setDownloading] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    
    // Subtitles state
    const [activeSubtitle, setActiveSubtitle] = useState("");

    const handleTimeUpdate = () => {
      if (!videoRef.current || !subtitles) return;
      const time = videoRef.current.currentTime;
      const active = subtitles.find(s => time >= s.start && time <= s.end);
      setActiveSubtitle(active ? active.text : "");
    };
    const audioRef = useRef(null);

    const handlePlayPause = (e) => {
      if (
        e.target.closest(".user-buttons-container") ||
        e.target.closest(".user-name-container") ||
        e.target.closest(".comments-sheet") ||
        e.target.closest(".comments-backdrop") ||
        e.target.closest(".donate-button")
      ) {
        return;
      }

      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            onVideoPlayStateChange?.(true);
          }).catch((err) => console.log(err));
          setShowPlayPauseIcon("play");
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
          onVideoPlayStateChange?.(false);
          setShowPlayPauseIcon("pause");
        }
        setTimeout(() => {
          setShowPlayPauseIcon(null);
        }, 500);
      }
    };

    const interestIcons = {
      "Anime & Manga": <FaRobot style={{ color: "#8B5CF6" }} />, 
      "Latest News": <FaNewspaper style={{ color: "#3B82F6" }} />, 
      "Humor": <FaLaugh style={{ color: "#FBBF24" }} />, 
      "Memes": <FaHeart style={{ color: "#EF4444" }} />, 
      "Gaming": <FaGamepad style={{ color: "#10B981" }} />, 
      "WTF": <FaBolt style={{ color: "#F97316" }} />, 
      "Relationship & Dating": <FaHeart style={{ color: "#EC4899" }} />, 
      "Motor Vehicles": <FaCar style={{ color: "#14B8A6" }} />, 
      "Animals & Pets": <FaPaw style={{ color: "#6366F1" }} />, 
      "Science & Tech": <FaFlask style={{ color: "#06B6D4" }} />, 
      "Comic": <FaStar style={{ color: "#F59E0B" }} />, 
      "Wholesome": <FaFireAlt style={{ color: "#DC2626" }} />, 
      "Sports": <FaFutbol style={{ color: "#84CC16" }} />, 
      "Movies & TV": <FaFilm style={{ color: "#8B5CF6" }} />, 
      "Cat": <FaCat style={{ color: "#6B7280" }} />, 
      "Food & Drinks": <FaUtensils style={{ color: "#F43F5E" }} />, 
      "Lifestyle": <FaGlobe style={{ color: "#10B981" }} />, 
      "Superhero": <FaSuperpowers style={{ color: "#2563EB" }} />, 
      "Crypto": <FaBitcoin style={{ color: "#F59E0B" }} />, 
      "Random": <FaRandom style={{ color: "#F59E0B" }} />
    };

    const safeInteractions = interactions || {};
    const likes = safeInteractions.likes || 0;
    const favorites = safeInteractions.favorites || 0;
    const comments = Array.isArray(safeInteractions.comments) ? safeInteractions.comments.length : (safeInteractions.comments || 0);		  
    const shares = safeInteractions.shares || 0;
    const downloads = safeInteractions.downloads || 0;
    const isUserBlocked = userProfile?.blockedUsers?.includes(userId) || false;

    const handleBlockUnblock = async () => {
      if (!currentUser || !userId) return;

      const userRef = doc(db, "users", currentUser.uid);
      try {
        if (isUserBlocked) {
          const newBlocked = (userProfile.blockedUsers || []).filter(id => id !== userId);
          await updateDoc(userRef, { blockedUsers: newBlocked });
          alert(`Has desbloqueado a @${username}.`);
        } else {
          if (window.confirm(`¿Estás seguro de que deseas bloquear a @${username}? No verás sus videos ni mensajes.`)) {
            const newBlocked = [...(userProfile.blockedUsers || []), userId];
            await updateDoc(userRef, { blockedUsers: newBlocked });
            alert(`Has bloqueado a @${username}.`);
            setShowLinksModal(false);
          }
        }
      } catch (err) {
        console.error("Error al bloquear/desbloquear usuario:", err);
        alert("Ocurrió un error al actualizar la lista de bloqueados.");
      }
    };
	  
    // ✅ Detectar si el usuario ya sigue al creador
    useEffect(() => {
      if (!userId) return;
      getFollowingList().then((following) => {
        setIsFollowing(following.includes(userId));
      });
    }, [userId]);

    // ✅ Obtener detalles del creador (como el email de PayPal y foto de perfil)
    useEffect(() => {
      if (!userId) {
        setCreatorPaypal("");
        setCreatorPhotoURL("");
        return;
      }
      if (userId.startsWith("demo-") || userId.startsWith("mock-")) {
        setCreatorPaypal("");
        setCreatorPhotoURL("");
        return;
      }
      const fetchCreatorDetails = async () => {
        try {
          const docRef = doc(db, "users", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCreatorPaypal(data.paypalEmail || "");
            setCreatorPhotoURL(data.profilePic || data.photoURL || "");
            setCreatorLinks(data.socialLinks || { instagram: "", twitter: "", youtube: "", custom: "" });
          } else {
            setCreatorPaypal("");
            setCreatorPhotoURL("");
            setCreatorLinks({ instagram: "", twitter: "", youtube: "", custom: "" });
          }
        } catch (e) {
          console.error("Error fetching creator details:", e);
          setCreatorPaypal("");
          setCreatorPhotoURL("");
          setCreatorLinks({ instagram: "", twitter: "", youtube: "", custom: "" });
        }
      };
      fetchCreatorDetails();
    }, [userId]);

    // ✅ Sincronizar música de fondo con el video
    useEffect(() => {
      const video = videoRef.current;
      const audio = audioRef.current;
      if (!video || !audio || !musicUrl) return;

      const handlePlay = () => {
        video.muted = true;
        audio.play()
          .then(() => setIsPlayingAudio(true))
          .catch((err) => console.log("Audio background music play blocked:", err));
      };

      const handlePause = () => {
        audio.pause();
        setIsPlayingAudio(false);
      };

      const handleVolume = () => {
        audio.muted = video.muted;
        audio.volume = video.volume;
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("volumechange", handleVolume);
      
      // Auto-play sync if video is already running
      if (!video.paused) {
        video.muted = true;
        audio.play().then(() => setIsPlayingAudio(true)).catch((err) => console.log(err));
      }

      return () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("volumechange", handleVolume);
        audio.pause();
        setIsPlayingAudio(false);
      };
    }, [musicUrl, videoUrl]);

    const handleShare = async () => {
      const shareUrl = `${window.location.origin}/?v=${riuzaki1234}`;
      const shareData = {
        title: `Mira este video de @${username} en Poptok`,
        text: description || "¡Mira este increíble contenido en Poptok!",
        url: shareUrl,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          onInteraction(riuzaki1234, "shares");
        } catch (err) {
          console.log("Error sharing:", err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("✅ ¡Enlace del video copiado al portapapeles!");
          onInteraction(riuzaki1234, "shares");
        } catch (err) {
          console.error("Error al copiar enlace:", err);
          alert("No se pudo copiar el enlace.");
        }
      }
    };

    const handleDownload = async () => {
      if (allowDownload === false) {
        alert("🔒 El creador ha deshabilitado las descargas para este video.");
        return;
      }

      setDownloading(true);
      try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `poptok_${username}_${riuzaki1234 || "video"}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(blobUrl);
        onInteraction(riuzaki1234, "downloads");
      } catch (err) {
        console.error("Error downloading video:", err);
        alert("Error al descargar el video.");
      } finally {
        setDownloading(false);
      }
    };


    // ✅ Seguir/Dejar de seguir usuario
    const handleFollow = async () => {
      const updated = await toggleFollow(userId);
      if (updated !== undefined) {
        setIsFollowing(updated);
      }
    };

    // Detectar si el video es vertical u horizontal
    useEffect(() => {
      const videoElement = videoRef.current;
      if (videoElement) {
        const handleLoadedMetadata = () => {
          const { videoWidth, videoHeight } = videoElement;
          setIsVertical(videoWidth < videoHeight);
        };

        videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
        return () => {
          videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
        };
      }
    }, []);

    // 1. Acumulador de tiempo de reproducción (segundo a segundo) y lógica RNG para aparecer gemas
    useEffect(() => {
      let timer;
      if (isPlaying && !showCoin) {
        timer = setInterval(() => {
          // Si la pestaña no está visible, no acumular tiempo
          if (document.hidden) return;

          // Cargar y actualizar tiempo acumulado en localStorage
          const currentWatchTime = Number(localStorage.getItem("poptok_cumulative_watch_time") || 0);
          const newWatchTime = currentWatchTime + 1;
          localStorage.setItem("poptok_cumulative_watch_time", newWatchTime);

          // Lógica de desbloqueo de gemas y roll RNG
          // Coin 1 (Rosa): 0s (prob 0.005)
          // Coin 2 (Naranja): 2h (7200s) (prob 0.002)
          // Coin 3 (Verde): 6h (21600s) (prob 0.001)
          // Coin 4 (Púrpura): 16h (57600s) (prob 0.0005)
          // Coin 5 (Azul): 40h (144000s) (prob 0.0001)
          
          if (newWatchTime >= 144000 && Math.random() < 0.0001) {
            spawnCoin(5);
          } else if (newWatchTime >= 57600 && Math.random() < 0.0005) {
            spawnCoin(4);
          } else if (newWatchTime >= 21600 && Math.random() < 0.001) {
            spawnCoin(3);
          } else if (newWatchTime >= 7200 && Math.random() < 0.002) {
            spawnCoin(2);
          } else if (Math.random() < 0.005) {
            spawnCoin(1);
          }
        }, 1000);
      }
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [isPlaying, showCoin]);

    // Función auxiliar para spawnear la moneda/gema
    const spawnCoin = (type) => {
      setSpawnedCoinType(type);
      
      // Posición aleatoria dentro del área visible
      const maxX = Math.max(50, window.innerWidth - 100);
      const maxY = Math.max(100, window.innerHeight - 200);
      setCoinPosition({
        x: Math.random() * (maxX - 50) + 50,
        y: Math.random() * (maxY - 100) + 100
      });

      // Velocidad y dirección aleatorias
      const dirX = Math.random() < 0.5 ? -1 : 1;
      const dirY = Math.random() < 0.5 ? -1 : 1;
      setVelocity({
        dx: dirX * (Math.random() * 1.5 + 1.2),
        dy: dirY * (Math.random() * 1.5 + 1.2)
      });

      setShowCoin(true);
    };

    // Hacer que la coin desaparezca si no se le da click en 30 segundos
    useEffect(() => {
      if (showCoin) {
        const coinTimeout = setTimeout(() => {
          setShowCoin(false);
        }, 30000);

        return () => clearTimeout(coinTimeout);
      }
    }, [showCoin]);

    // Movimiento y rebote de la coin
    useEffect(() => {
      if (!showCoin) return;

      const moveCoin = setInterval(() => {
        setCoinPosition((prev) => {
          let newX = prev.x + velocity.dx;
          let newY = prev.y + velocity.dy;

          // Rebote horizontal
          if (newX <= 10 || newX + 50 >= window.innerWidth) {
            setVelocity((v) => ({ ...v, dx: -v.dx }));
          }
          // Rebote vertical
          if (newY <= 50 || newY + 50 >= window.innerHeight) {
            setVelocity((v) => ({ ...v, dy: -v.dy }));
          }

          return { x: newX, y: newY };
        });
      }, 16);

      return () => clearInterval(moveCoin);
    }, [showCoin, velocity]);

    // Clic en la coin
    const handleCoinClick = () => {
      setShowCoin(false);
      onInteraction(uid, "coins", spawnedCoinType);
    };

    // Intersection Observer para reproducir videos visibles
    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoRef.current?.play().then(() => {
                setIsPlaying(true);
                onVideoPlayStateChange?.(true);
              }).catch((err) => console.log("Auto-play blocked:", err));
            } else {
              videoRef.current?.pause();
              setIsPlaying(false);
              onVideoPlayStateChange?.(false);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(videoElement);

      return () => {
        observer.unobserve(videoElement);
      };
    }, []);

    // Habilitar el sonido después de la interacción del usuario
    const enableSound = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
    };

    // Escucha el evento de clic en toda la página
    useEffect(() => {
      document.addEventListener("click", enableSound);
      return () => {
        document.removeEventListener("click", enableSound);
      };
    }, []);

    // Función para dar like
    const handleLikes = () => {
      if (!currentUser) {
        alert("⚠ Debes iniciar sesión para dar Like.");
        return;
      }
      if (!hasLiked) {
        onInteraction(riuzaki1234, "likes");
        setHasLiked(true);
        setShowDonateButton(true);

        setFloatingHearts((prev) => [
          ...prev,
          { id: Date.now(), x: Math.random() * 50 + 25, y: 100 },
        ]);

        setTimeout(() => {
          setFloatingHearts((prev) => prev.slice(1));
        }, 1000);
      }
    };

    // Función de Donación PayPal
    const handleDonate = () => {
      if (!creatorPaypal) {
        alert("Error: El creador del video no tiene registrado su PayPal.");
        return;
      }
      window.open(`https://www.paypal.com/donate?business=${creatorPaypal}&currency_code=MXN&amount=5`, "_blank");
    };

    // Función para dar favorito
    const handleFavorites = () => {
      if (!currentUser) {
        alert("⚠ Debes iniciar sesión para guardar en Favoritos.");
        return;
      }
      if (!hasFavorited) {
        onInteraction(riuzaki1234, "favorites");
        setHasFavorited(true);

        setFloatingSparks((prev) => [
          ...prev,
          { id: Date.now(), x: Math.random() * 50 + 25, y: 100 },
        ]);

        setTimeout(() => {
          setFloatingSparks((prev) => prev.slice(1));
        }, 1000);
      }
    };

    // Función para formatear números grandes
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
      if (num >= 1000) return (num / 1000).toFixed(1) + "K";
      return num;
    };

    return (
      <div className={`video-container ${isVertical ? "vertical" : "horizontal"} ${showComments ? "shrink" : ""}`}>
        <div className="relative w-full h-full" onClick={handlePlayPause}>
          {reactionComment && (
            <div className="reaction-comment-sticker" style={{
              position: "absolute",
              top: "90px",
              left: "15px",
              background: "rgba(255, 255, 255, 0.95)",
              color: "#000",
              padding: "10px 14px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              maxWidth: "260px",
              zIndex: 30,
              fontSize: "13px",
              fontWeight: "500",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              borderLeft: "5px solid #ff0050",
              pointerEvents: "none"
            }}>
              <span style={{ fontWeight: "700", color: "#ff0050" }}>💬 @{reactionComment.username}</span>
              <span style={{ color: "#333", lineHeight: "1.4" }}>"{reactionComment.text}"</span>
            </div>
          )}
          {activeSubtitle && (
            <div className="video-subtitle-overlay" style={{
              position: "absolute",
              bottom: "150px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0, 0, 0, 0.75)",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "bold",
              zIndex: 25,
              pointerEvents: "none",
              textAlign: "center",
              maxWidth: "80%",
              boxShadow: "0 4px 10px rgba(0,0,0,0.5)"
            }}>
              {activeSubtitle}
            </div>
          )}
          {musicUrl && (
            <audio
              ref={audioRef}
              src={musicUrl}
              loop
            />
          )}
          {hasError ? (
            <p style={{ textAlign: "center", color: "gray", marginTop: "50%" }}>No se pudo cargar el video.</p>
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              className="video-player"
              autoPlay
              playsInline
              muted
              loop
              onTimeUpdate={handleTimeUpdate}
              onError={() => setHasError(true)}
            >
              Tu navegador no soporta videos.
            </video>
          )}

          {/* Overlay de Play/Pause al hacer tap */}
          {showPlayPauseIcon && (
            <div className="play-pause-overlay-ping">
              {showPlayPauseIcon === "play" ? <FaPlay size={36} /> : <FaPause size={36} />}
            </div>
          )}

          {/* Icono de Play estático si el video está pausado */}
          {!isPlaying && !showPlayPauseIcon && (
            <div className="video-paused-indicator">
              <FaPlay size={30} />
            </div>
          )}

          {/* Coin animada */}
          {showCoin && (
            <div
              style={{
                position: "absolute",
                left: coinPosition.x,
                top: coinPosition.y,
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                cursor: "pointer",
              }}
              onClick={handleCoinClick}
            >
              <img
                src={coinImages[spawnedCoinType] || coinImages[1]}
                alt={`Coin ${spawnedCoinType}`}
                className="rotating-gem"
                style={{
                  width: "24px",
                  height: "24px",
                  "--glow-color": coinGlowColors[spawnedCoinType] || "#ff4a9a"
                }}
              />
            </div>
          )}

          {/* Ventana de comentarios */}
          {showComments && (
            <Comments
              riuzaki1234={riuzaki1234}
              onClose={() => setShowComments(false)}
              onReactToComment={(cmtText, cmtUser) => {
                onReactToComment?.({ text: cmtText, username: cmtUser, parentVideoId: riuzaki1234 });
                setShowComments(false);
              }}
              onCommentSubmit={(commentText) => {
                if (!riuzaki1234) {
                  console.error("❌ Error: riuzaki1234 está indefinido en VideoPlayer.");
                  return;
                }
                if (!currentUser) {
                  console.error("❌ Error: currentUser está indefinido en VideoPlayer.");
                  return;
                }
                if (typeof commentText !== "string") {
                  console.error("🚨 Error: commentText no es un string válido.", commentText);
                  return;
                }
                
                const newComment = {
                  commentId: Date.now().toString(),
                  text: commentText.trim(), 
                  timestamp: new Date().toISOString(),
                  userId: currentUser.uid,
                  username: currentUser.displayName || "Anónimo",
                };

                console.log(`📩 Enviando comentario: ${JSON.stringify(newComment)}`);
                updateVideoComments(riuzaki1234, newComment, currentUser);
              }}
            />
          )}

          {/* Contenedor del nombre de usuario */}
          <div className="user-name-container" onClick={() => setShowLinksModal(true)} style={{ cursor: "pointer" }}>
            <h3 className="text-lg font-semibold text-white p-0.5 rounded">
              @{username}
            </h3>

            {/* Descripción del video */}
            {description && (
              <div className="relative bg-black/60 px-2 py-0.5 rounded text-white text-sm max-w-xs" style={{ marginTop: "5px" }}>
                <span>{description}</span>
              </div>
            )}

            {/* Categoría del video */}
            {interest && (
              <div className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center" style={{ marginTop: "5px", width: "fit-content" }}>
                {interestIcons[interest] || <FaStar className="text-white" />}
                <span className="ml-1" style={{ marginLeft: "5px" }}>{CATEGORY_MAP[interest] || interest}</span>
              </div>
            )}

            {/* Music Info */}
            {musicTitle && (
              <div className="video-music-info" style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", color: "#00f2fe", fontSize: "13px" }}>
                <FaMusic className="music-icon-spin" />
                <span className="music-marquee">{musicTitle}</span>
              </div>
            )}

            {/* Botón de Donar si el usuario le dio like y el creador tiene PayPal */}
            {showDonateButton && creatorPaypal && (
              <button 
                onClick={handleDonate} 
                className="donate-button" 
                style={{ marginTop: "10px" }}
              >
                <FaPaypal className="paypal-icon" /> Donar $5 MXN
              </button>
            )}
          </div>

          {/* Vinyl CSS Disc */}
          {musicUrl && (
            <div className={`music-disc-wrapper ${isPlaying ? "spinning" : ""}`}>
              <div className="vinyl-disc">
                <div className="vinyl-center" />
              </div>
            </div>
          )}
				 
          {/* Contenedor de la imagen de usuario y los botones */}
          <div className="user-buttons-container">
            <div className="user-image" onClick={() => setShowLinksModal(true)} style={{ cursor: "pointer" }}>
              <img
                src={creatorPhotoURL || userPhotoURL || defaultUserImage}
                onError={(e) => { e.target.src = defaultUserImage; }}
                className="w-10 h-10 rounded-full border-2 border-white"
                alt="Perfil"
              />
              {/* Botón de seguir */}
              {userId && currentUser && userId !== currentUser.uid && !isFollowing && (
                <button onClick={handleFollow} style={{ background: "none", border: "none", padding: 0 }}>
                  <FaCirclePlus className="follow-icon" />
                </button>
              )}
            </div>
			
            <div className="buttons-container">
              {/* Botón de Like */}
              <button onClick={handleLikes} className={`icon-button like-button ${hasLiked ? "clicked" : ""}`} disabled={hasLiked}>
                {hasLiked ? <AiFillHeart className="icon liked" style={{ color: "#FF0050" }} /> : <AiOutlineHeart className="icon" />}
                <span className="interaction-count">{formatNumber(likes)}</span>

                {floatingHearts.map((heart) => (
                  <AiFillHeart
                    key={heart.id}
                    className="floating-heart"
                    style={{
                      left: `${heart.x}px`,
                      top: `${heart.y}px`,
                      animation: "floatUp 1s ease-out",
                      position: "absolute",
                      color: "#FF0050"
                    }}
                  />
                ))}
              </button>

              {/* Botón de Comentarios */}
              <button onClick={() => setShowComments(true)} className="icon-button">
                <AiOutlineComment className="icon" />
                <span className="interaction-count">{formatNumber(comments)}</span>
              </button>

              {/* Botón de Favoritos */}
              <button onClick={handleFavorites} className={`icon-button favorite-button ${hasFavorited ? "clicked" : ""}`} disabled={hasFavorited}>
                {hasFavorited ? <BsStarFill className="icon favorited" style={{ color: "#FFBB00" }} /> : <BsStar className="icon" />}
                <span className="interaction-count">{formatNumber(favorites)}</span>

                {floatingSparks.map((spark) => (
                  <BsStarFill
                    key={spark.id}
                    className="floating-spark"
                    style={{
                      left: `${spark.x}px`,
                      top: `${spark.y}px`,
                      animation: "sparkBurst 1s ease-out",
                      position: "absolute",
                      color: "#FFBB00"
                    }}
                  />
                ))}
              </button>

              {/* Botón de Compartir */}
              <button onClick={handleShare} className="icon-button">
                <FiShare2 className="icon" />
                <span className="interaction-count">{formatNumber(shares)}</span>
              </button>

              {/* Botón de Descargar */}
              <button onClick={handleDownload} className="icon-button" disabled={downloading || allowDownload === false} style={{ opacity: allowDownload === false ? 0.4 : 1 }}>
                <FiDownload className="icon" style={{ animation: downloading ? "bounce 1s infinite alternate" : "none" }} />
                <span className="interaction-count">{formatNumber(downloads)}</span>
              </button>

              {/* Botón de Eliminar (papelera, solo si es el creador) */}
              {userId && currentUser && userId === currentUser.uid && onDeleteVideo && (
                <button onClick={() => onDeleteVideo(riuzaki1234)} className="icon-button" style={{ color: "#ff0050" }}>
                  <FiTrash2 className="icon" />
                </button>
              )}
            </div>
          </div>

          {/* Linktree-Style Social Links Modal */}
          {showLinksModal && (
            <div className="social-links-modal-backdrop" style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 3000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px"
            }} onClick={(e) => { e.stopPropagation(); setShowLinksModal(false); }}>
              <div className="social-links-card" style={{
                background: "rgba(20, 20, 20, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "24px",
                padding: "24px",
                width: "90%",
                maxWidth: "320px",
                textAlign: "center",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                animation: "scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both"
              }} onClick={(e) => e.stopPropagation()}>
                {/* User Info */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <img
                    src={creatorPhotoURL || userPhotoURL || defaultUserImage}
                    onError={(e) => { e.target.src = defaultUserImage; }}
                    style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #ff0050", objectFit: "cover" }}
                    alt="avatar"
                  />
                  <h4 style={{ color: "#fff", fontSize: "16px", fontWeight: "bold", margin: 0 }}>@{username}</h4>
                  <p style={{ color: "#aaa", fontSize: "12px", margin: 0 }}>Enlaces del creador</p>
                </div>

                {/* Social Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                  {creatorLinks.instagram && (
                    <a
                      href={creatorLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "30px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        boxShadow: "0 4px 10px rgba(225, 48, 108, 0.3)"
                      }}
                    >
                      <FaInstagram size={18} /> Instagram
                    </a>
                  )}

                  {creatorLinks.twitter && (
                    <a
                      href={creatorLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#fff",
                        color: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "30px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textDecoration: "none"
                      }}
                    >
                      <FaTwitter size={18} /> X (Twitter)
                    </a>
                  )}

                  {creatorLinks.youtube && (
                    <a
                      href={creatorLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#ff0000",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "30px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        boxShadow: "0 4px 10px rgba(255, 0, 0, 0.3)"
                      }}
                    >
                      <FaYoutube size={18} /> YouTube
                    </a>
                  )}

                  {creatorPaypal && (
                    <a
                      href={`https://www.paypal.com/donate?business=${creatorPaypal}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#0070ba",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "30px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        boxShadow: "0 4px 10px rgba(0, 112, 186, 0.3)"
                      }}
                    >
                      <FaPaypal size={18} /> Paypal (Donar)
                    </a>
                  )}

                  {creatorLinks.custom && (
                    <a
                      href={creatorLinks.custom}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "linear-gradient(135deg, #00f2fe, #4facfe)",
                        color: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "30px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        textDecoration: "none",
                        boxShadow: "0 4px 10px rgba(0, 242, 254, 0.3)"
                      }}
                    >
                      <FaExternalLinkAlt size={16} /> Sitio Web
                    </a>
                  )}

                  {!creatorLinks.instagram && !creatorLinks.twitter && !creatorLinks.youtube && !creatorPaypal && !creatorLinks.custom && (
                    <p style={{ color: "#888", fontSize: "13px", margin: "10px 0" }}>Este creador aún no tiene enlaces configurados.</p>
                  )}

                  {currentUser && userId && userId !== currentUser.uid && (
                    <button
                      onClick={handleBlockUnblock}
                      style={{
                        background: isUserBlocked ? "rgba(255, 255, 255, 0.15)" : "#ff0050",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "30px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        border: "none",
                        cursor: "pointer",
                        width: "100%",
                        boxShadow: isUserBlocked ? "none" : "0 4px 10px rgba(255, 0, 80, 0.3)",
                        marginTop: "10px"
                      }}
                    >
                      {isUserBlocked ? "🚫 Desbloquear usuario" : "🚫 Bloquear usuario"}
                    </button>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowLinksModal(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    borderRadius: "30px",
                    padding: "8px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    marginTop: "5px"
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
