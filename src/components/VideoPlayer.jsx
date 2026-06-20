import React, { forwardRef, useState, useEffect, useRef } from "react";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment } from "react-icons/ai";
import { BsStar, BsStarFill } from "react-icons/bs";
import { FaCirclePlus } from "react-icons/fa6";
import { FiShare2, FiDownload } from "react-icons/fi";
import Comments from "./Comments.jsx";
import { toggleFollow, getFollowingList } from "../utils/follow.js";
import { db } from "../firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { 
  FaGamepad, FaCat, FaCar, FaFlask, FaFilm, FaUtensils, FaLaugh, 
  FaHeart, FaMusic, FaRobot, FaBolt, FaGlobe, FaBitcoin, FaRandom, 
  FaNewspaper, FaFutbol, FaSuperpowers, FaFireAlt, FaStar, FaPaw, FaPaypal,
  FaPlay, FaPause
} from "react-icons/fa";

import coin1 from "../assets/coin_1.png";
import coin2 from "../assets/coin_2.png";
import coin3 from "../assets/coin_3.png";
import coin4 from "../assets/coin_4.png";
import coin5 from "../assets/coin_5.png";
import coin6 from "../assets/coin_6.png";

const coinImages = {
  1: coin1,
  2: coin2,
  3: coin3,
  4: coin4,
  5: coin5,
  6: coin6
};

const VideoPlayer = forwardRef(
  ({ videoUrl, username, riuzaki1234, interactions, onInteraction, uid, currentUser, userProfile, userId, commentsList, updateVideoComments, description, interest, musicUrl, musicTitle, allowDownload }, ref) => {
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
    const defaultUserImage = "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"; 
    const [showDonateButton, setShowDonateButton] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(null); // "play" | "pause" | null
    const [creatorPaypal, setCreatorPaypal] = useState("");
    const [downloading, setDownloading] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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
          videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.log(err));
          setShowPlayPauseIcon("play");
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
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
	  
    // ✅ Detectar si el usuario ya sigue al creador
    useEffect(() => {
      if (!userId) return;
      getFollowingList().then((following) => {
        setIsFollowing(following.includes(userId));
      });
    }, [userId]);

    // ✅ Obtener detalles del creador (como el email de PayPal)
    useEffect(() => {
      if (!userId) {
        setCreatorPaypal("");
        return;
      }
      if (userId.startsWith("demo-") || userId.startsWith("mock-")) {
        setCreatorPaypal("");
        return;
      }
      const fetchCreatorDetails = async () => {
        try {
          const docRef = doc(db, "users", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCreatorPaypal(docSnap.data().paypalEmail || "");
          } else {
            setCreatorPaypal("");
          }
        } catch (e) {
          console.error("Error fetching creator PayPal details:", e);
          setCreatorPaypal("");
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
      const shareData = {
        title: `Mira este video de @${username} en Poptok`,
        text: description || "¡Mira este increíble contenido en Poptok!",
        url: videoUrl,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.log("Error sharing:", err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(videoUrl);
          alert("✅ ¡Enlace del video copiado al portapapeles!");
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
              videoRef.current?.play().then(() => setIsPlaying(true)).catch((err) => console.log("Auto-play blocked:", err));
            } else {
              videoRef.current?.pause();
              setIsPlaying(false);
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
              className="video-player"
              autoPlay
              playsInline
              muted
              loop
              onError={() => setHasError(true)}
            >
              <source src={videoUrl} type="video/mp4" />
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
                width: "55px",
                height: "55px",
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
                style={{
                  width: "45px",
                  height: "45px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255, 255, 255, 0.7)",
                  objectFit: "cover",
                  animation: "float 1.8s ease-in-out infinite, glowPulse 1.5s ease-in-out infinite alternate"
                }}
              />
            </div>
          )}

          {/* Ventana de comentarios */}
          {showComments && (
            <Comments
              riuzaki1234={riuzaki1234}
              onClose={() => setShowComments(false)}
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
          <div className="user-name-container">
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
                <span className="ml-1" style={{ marginLeft: "5px" }}>{interest}</span>
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
            <div className="user-image">
              <img
                src={userId ? `/profile-pics/${userId}.png` : defaultUserImage}
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
              </button>

              {/* Botón de Descargar */}
              <button onClick={handleDownload} className="icon-button" disabled={downloading || allowDownload === false} style={{ opacity: allowDownload === false ? 0.4 : 1 }}>
                <FiDownload className="icon" style={{ animation: downloading ? "bounce 1s infinite alternate" : "none" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
