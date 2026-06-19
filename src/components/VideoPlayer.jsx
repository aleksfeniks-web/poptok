import React, { forwardRef, useState, useEffect, useRef } from "react";
import { AiOutlineHeart, AiFillHeart, AiOutlineComment } from "react-icons/ai";
import { BsStar, BsStarFill } from "react-icons/bs";
import { FaCirclePlus } from "react-icons/fa6";
import Comments from "./Comments.jsx";
import { toggleFollow, getFollowingList } from "../utils/follow.js";
import { 
  FaGamepad, FaCat, FaCar, FaFlask, FaFilm, FaUtensils, FaLaugh, 
  FaHeart, FaMusic, FaRobot, FaBolt, FaGlobe, FaBitcoin, FaRandom, 
  FaNewspaper, FaFutbol, FaSuperpowers, FaFireAlt, FaStar, FaPaw, FaPaypal 
} from "react-icons/fa";

const VideoPlayer = forwardRef(
  ({ videoUrl, username, riuzaki1234, interactions, onInteraction, uid, currentUser, userId, commentsList, updateVideoComments, description, interest }, ref) => {
    const [hasError, setHasError] = useState(false);
    const [showCoin, setShowCoin] = useState(false);
    const [coinPosition, setCoinPosition] = useState({ x: 0, y: 0 });
    const [velocity, setVelocity] = useState({ dx: 1, dy: 1 });
    const videoRef = useRef(null);
    const [hasLiked, setHasLiked] = useState(false);
    const [hasFavorited, setHasFavorited] = useState(false);
    const [floatingHearts, setFloatingHearts] = useState([]);
    const [floatingSparks, setFloatingSparks] = useState([]);
    const [showComments, setShowComments] = useState(false);
    const [isVertical, setIsVertical] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const defaultUserImage = "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"; 
    const [showDonateButton, setShowDonateButton] = useState(false);

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

    // Mostrar coin cada cierto tiempo
    useEffect(() => {
      const interval = setInterval(() => {
        setShowCoin(true);
        setCoinPosition({ x: 100, y: 100 });
        setVelocity({ dx: 1.5, dy: 1.5 });
      }, 300000); // 5 minutos

      return () => clearInterval(interval);
    }, []);

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

          if (newX <= 0 || newX + 40 >= window.innerWidth) {
            setVelocity((v) => ({ ...v, dx: -v.dx }));
          }
          if (newY <= 0 || newY + 40 >= window.innerHeight) {
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
      onInteraction(uid, "coins");
    };

    // Intersection Observer para reproducir videos visibles
    useEffect(() => {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              videoRef.current?.play().catch((err) => console.log("Auto-play blocked:", err));
            } else {
              videoRef.current?.pause();
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
      if (!userId) {
        alert("Error: El creador del video no está definido.");
        return;
      }
      window.open(`https://www.paypal.com/donate?business=${userId}@poptok.com&currency_code=MXN&amount=5`, "_blank");
    };

    // Función para dar favorito
    const handleFavorites = () => {
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
        <div className="relative w-full h-full">
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
              controls
              onError={() => setHasError(true)}
            >
              <source src={videoUrl} type="video/mp4" />
              Tu navegador no soporta videos.
            </video>
          )}

          {/* Coin animada */}
          {showCoin && (
            <div
              style={{
                position: "absolute",
                left: coinPosition.x,
                top: coinPosition.y,
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                cursor: "pointer",
              }}
              onClick={handleCoinClick}
            >
              <img
                src="https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/coin.png"
                alt="Coin"
                style={{
                  width: "30px",
                  height: "30px",
                  animation: "bounce 0.5s infinite alternate, rotate 2s linear infinite, glow 1s infinite alternate",
                }}
              />
            </div>
          )}

          {/* Ventana de comentarios */}
          {showComments && (
            <div className="comments-container">
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
            </div>
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

            {/* Botón de Donar si el usuario le dio like */}
            {showDonateButton && userId && (
              <button 
                onClick={handleDonate} 
                className="donate-button" 
                style={{ marginTop: "10px" }}
              >
                <FaPaypal className="paypal-icon" /> Donar $5 MXN
              </button>
            )}
          </div>
				 
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
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
