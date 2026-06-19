import React, { useState, useEffect, useRef } from "react";
import { AiOutlineClose } from "react-icons/ai";

const Game = ({ coins, setCoins, uid, saveScore, onCloseGame }) => {
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [basketX, setBasketX] = useState(50); // percentage (0-100)
  const [coinY, setCoinY] = useState(0); // percentage
  const [coinX, setCoinX] = useState(Math.random() * 80 + 10); // percentage
  const [coinsEarned, setCoinsEarned] = useState(0);

  const gameLoopRef = useRef(null);

  // Keyboard controls
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setBasketX((x) => Math.max(5, x - 10));
      } else if (e.key === "ArrowRight") {
        setBasketX((x) => Math.min(95, x + 10));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, gameOver]);

  // Main Game Loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const tick = () => {
      setCoinY((y) => {
        const nextY = y + 2;

        // Check if coin hits the bottom
        if (nextY >= 90) {
          // Check collision with basket (basket is at ~90% Y, width is ~20%)
          const dist = Math.abs(coinX - basketX);
          if (dist < 12) {
            // Caught!
            setScore((s) => {
              const newScore = s + 1;
              // Every 5 caught coins = +1 actual coin
              if (newScore % 5 === 0) {
                setCoinsEarned((c) => c + 1);
                setCoins((prevCoins) => prevCoins + 1);
              }
              return newScore;
            });
            // Reset coin
            setCoinY(0);
            setCoinX(Math.random() * 80 + 10);
          } else if (nextY >= 100) {
            // Missed! Game Over
            setGameOver(true);
            return 0;
          }
        }
        return nextY;
      });
    };

    gameLoopRef.current = setInterval(tick, 30);
    return () => clearInterval(gameLoopRef.current);
  }, [gameStarted, gameOver, coinX, basketX, setCoins]);

  // Handle saving score on Game Over
  useEffect(() => {
    if (gameOver && uid) {
      saveScore(uid, score, coins + coinsEarned);
    }
  }, [gameOver, uid, score, coinsEarned, saveScore]);

  const startGame = () => {
    setScore(0);
    setCoinsEarned(0);
    setCoinY(0);
    setBasketX(50);
    setGameOver(false);
    setGameStarted(true);
  };

  return (
    <div id="game-container" style={{ position: "relative", width: "100%", height: "300px", background: "#111", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Game Header */}
      <div style={{ padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333", background: "#1a1a1a" }}>
        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#FFBB00" }}>🎮 Poptok Catcher</span>
        <button onClick={onCloseGame} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
          <AiOutlineClose size={18} />
        </button>
      </div>

      {!gameStarted && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "#aaa" }}>¡Mueve la canasta para atrapar las monedas que caen! Cada 5 monedas ganas +1 moneda real.</p>
          <button onClick={startGame} style={{ padding: "8px 16px", background: "#FF0050", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}>
            Jugar
          </button>
        </div>
      )}

      {gameStarted && !gameOver && (
        <div style={{ flex: 1, position: "relative", width: "100%", background: "#080808" }}>
          {/* Falling Coin */}
          <div style={{
            position: "absolute",
            left: `${coinX}%`,
            top: `${coinY}%`,
            transform: "translateX(-50%)",
            width: "20px",
            height: "20px",
            background: "radial-gradient(circle, #ffe066 0%, #f5b041 100%)",
            borderRadius: "50%",
            boxShadow: "0 0 8px #f1c40f",
            animation: "rotate 2s linear infinite"
          }} />

          {/* Basket */}
          <div style={{
            position: "absolute",
            left: `${basketX}%`,
            bottom: "10px",
            transform: "translateX(-50%)",
            width: "50px",
            height: "15px",
            background: "#FF0050",
            borderRadius: "0 0 10px 10px",
            border: "2px solid white",
            boxShadow: "0 0 8px #FF0050"
          }} />

          {/* On-screen controls for mobile */}
          <div style={{ position: "absolute", bottom: "35px", left: "0", right: "0", display: "flex", justifyContent: "space-between", padding: "0 20px" }}>
            <button
              onTouchStart={() => setBasketX((x) => Math.max(5, x - 15))}
              onClick={() => setBasketX((x) => Math.max(5, x - 15))}
              style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid #444", borderRadius: "5px", cursor: "pointer", touchAction: "none" }}
            >
              ◀ Left
            </button>
            <button
              onTouchStart={() => setBasketX((x) => Math.min(95, x + 15))}
              onClick={() => setBasketX((x) => Math.min(95, x + 15))}
              style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid #444", borderRadius: "5px", cursor: "pointer", touchAction: "none" }}
            >
              Right ▶
            </button>
          </div>

          {/* Score Overlay */}
          <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "12px", color: "#aaa" }}>Puntos: <strong style={{ color: "white" }}>{score}</strong></span>
            <span style={{ fontSize: "12px", color: "#FFBB00" }}>Ganado: <strong>+{coinsEarned} 🪙</strong></span>
          </div>
        </div>
      )}

      {gameOver && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px", padding: "20px" }}>
          <h3 style={{ color: "#FF0050", margin: 0 }}>¡Fin del Juego!</h3>
          <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>Atrapaste {score} monedas y ganaste +{coinsEarned} 🪙 reales.</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={startGame} style={{ padding: "6px 12px", background: "#FF0050", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}>
              Reintentar
            </button>
            <button onClick={onCloseGame} style={{ padding: "6px 12px", background: "#444", color: "white", border: "none", borderRadius: "20px", cursor: "pointer" }}>
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
