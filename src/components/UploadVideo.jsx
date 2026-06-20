import React, { useState, useRef, useEffect } from "react";
import { auth, db, storage } from "../firebase.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { FiVideo, FiImage, FiType, FiUploadCloud, FiX, FiZap, FiCheck } from "react-icons/fi";

const interestOptions = [
  "Random", "Anime & Manga", "Latest News", "Humor", "Memes", "Gaming",
  "WTF", "Relationship & Dating", "Motor Vehicles", "Animals & Pets",
  "Science & Tech", "ASMR", "Sports", "Movies & TV", "Food & Drinks",
  "Lifestyle", "Superhero", "Crypto", "IA", "WoW"
];

// AI text-to-image style presets
const AI_STYLES = [
  { id: "gradient", label: "🎨 Gradiente", bg: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff" },
  { id: "dark",     label: "🌑 Oscuro",    bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", color: "#fff" },
  { id: "sunset",   label: "🌅 Atardecer", bg: "linear-gradient(135deg,#f093fb,#f5576c)", color: "#fff" },
  { id: "ocean",    label: "🌊 Océano",    bg: "linear-gradient(135deg,#4facfe,#00f2fe)", color: "#fff" },
  { id: "forest",   label: "🌿 Bosque",    bg: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "#000" },
  { id: "fire",     label: "🔥 Fuego",     bg: "linear-gradient(135deg,#f7971e,#ffd200)", color: "#000" },
];

// AI video filters
const AI_FILTERS = [
  { id: "none",       label: "Original",   filter: "" },
  { id: "vivid",      label: "✨ Vívido",   filter: "saturate(1.8) contrast(1.1)" },
  { id: "cinematic",  label: "🎬 Cine",     filter: "contrast(1.2) sepia(0.3)" },
  { id: "noir",       label: "⚫ Noir",     filter: "grayscale(1) contrast(1.3)" },
  { id: "warm",       label: "🌤 Cálido",   filter: "sepia(0.5) saturate(1.4)" },
  { id: "cool",       label: "❄️ Frío",     filter: "hue-rotate(30deg) saturate(1.2)" },
];

const MUSIC_TRACKS = [
  { id: "none", name: "🎵 Sin música de fondo" },
  { id: "vibes", name: "🌴 Summer Vibes (Electro)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "synth", name: "🎹 Tech Beat (Synthwave)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "folk", name: "🎸 Acoustic Folk (Guitar)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "lofi", name: "☕ Relaxing Lofi (Hip Hop)", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
];

const UploadVideo = ({ onUploadSuccess, reactionComment, clearReaction }) => {
  const [tab, setTab] = useState("video"); // "video" | "photo" | "text"
  const [videoFile, setVideoFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [description, setDescription] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Timed Subtitles states
  const [subtitlesList, setSubtitlesList] = useState([]);
  const [subText, setSubText] = useState("");
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");

  // WebRTC camera recording states
  const [cameraStream, setCameraStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState("none"); // "none" | "sunglasses" | "hat" | "crown" | "mustache"
  const [stickerX, setStickerX] = useState(50);
  const [stickerY, setStickerY] = useState(40);
  const [stickerScale, setStickerScale] = useState(1.0);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const videoElementRef = useRef(null);
  const recordCanvasRef = useRef(null);

  // AI state
  const [showAI, setShowAI] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedStyle, setSelectedStyle] = useState("gradient");
  const [textContent, setTextContent] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState("none");
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const handleAddSubtitle = () => {
    if (!subText.trim() || subStart === "" || subEnd === "") return;
    const start = parseFloat(subStart);
    const end = parseFloat(subEnd);
    if (isNaN(start) || isNaN(end) || start >= end) {
      alert("El segundo de inicio debe ser menor que el de fin.");
      return;
    }
    setSubtitlesList(prev => [...prev, { text: subText.trim(), start, end }]);
    setSubText("");
    setSubStart("");
    setSubEnd("");
  };

  const handleRemoveSubtitle = (index) => {
    setSubtitlesList(prev => prev.filter((_, i) => i !== index));
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setRecording(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 640, facingMode: "user" },
        audio: true
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play().catch(e => console.log("Video play error:", e));
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara o micrófono. Asegúrate de otorgar los permisos necesarios.");
    }
  };

  useEffect(() => {
    if (tab === "record") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [tab]);

  // Real-time canvas drawing loop
  useEffect(() => {
    let animId;
    const canvas = recordCanvasRef.current;
    const video = videoElementRef.current;
    if (!canvas || !video || !isCameraActive || tab !== "record") return;

    const ctx = canvas.getContext("2d");
    
    const drawFrame = () => {
      if (video.paused || video.ended) {
        animId = requestAnimationFrame(drawFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (selectedSticker !== "none") {
        let stickerEmoji = "";
        if (selectedSticker === "sunglasses") stickerEmoji = "🕶️";
        else if (selectedSticker === "hat") stickerEmoji = "🎩";
        else if (selectedSticker === "crown") stickerEmoji = "👑";
        else if (selectedSticker === "mustache") stickerEmoji = "👨";

        const x = (stickerX / 100) * canvas.width;
        const y = (stickerY / 100) * canvas.height;
        const size = 90 * stickerScale;

        ctx.font = `${size}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (selectedSticker === "mustache") {
          ctx.fillText("👨", x, y - 20);
        } else {
          ctx.fillText(stickerEmoji, x, y);
        }
      }

      animId = requestAnimationFrame(drawFrame);
    };

    canvas.width = 480;
    canvas.height = 640;
    
    video.addEventListener("play", () => {
      drawFrame();
    });
    
    if (!video.paused) {
      drawFrame();
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isCameraActive, tab, selectedSticker, stickerX, stickerY, stickerScale]);

  const startRecording = () => {
    const canvas = recordCanvasRef.current;
    if (!canvas || !cameraStream) return;

    const chunks = [];
    const canvasStream = canvas.captureStream(30);
    const audioTracks = cameraStream.getAudioTracks();
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }

    const recorder = new MediaRecorder(canvasStream, { mimeType: "video/webm;codecs=vp9,opus" });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/mp4" });
      const previewUrl = URL.createObjectURL(blob);
      setVideoFile(new File([blob], "recorded-video.mp4", { type: "video/mp4" }));
      setVideoPreviewUrl(previewUrl);
      setTab("video");
      stopCamera();
    };

    setRecordedChunks(chunks);
    setMediaRecorder(recorder);
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => {
      unsub();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const handleMusicChange = (e) => {
    const val = e.target.value;
    setSelectedMusic(val);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const togglePreviewMusic = () => {
    const track = MUSIC_TRACKS.find(t => t.id === selectedMusic);
    if (!track || !track.url) return;

    if (isPlayingPreview) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(track.url);
        previewAudioRef.current.loop = true;
      }
      previewAudioRef.current.play()
        .then(() => setIsPlayingPreview(true))
        .catch(err => console.error("Error playing music preview:", err));
    }
  };

  // ─── File selection ────────────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (tab === "video" && file.type.startsWith("video/")) selectVideo(file);
    if (tab === "photo" && file.type.startsWith("image/")) selectImage(file);
  };

  const selectVideo = (file) => {
    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const selectImage = (file) => {
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const openFilePicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = tab === "video" ? "video/*" : "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (tab === "video") selectVideo(file);
      else selectImage(file);
    };
    input.click();
  };

  const clearSelection = () => {
    setVideoFile(null);
    setImageFile(null);
    setVideoPreviewUrl(null);
    setImagePreviewUrl(null);
  };

  // ─── Generate text-as-image from canvas ───────────────────────────────────
  const generateTextImage = () =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      const ctx = canvas.getContext("2d");
      const style = AI_STYLES.find(s => s.id === selectedStyle);

      canvas.width = 1080;
      canvas.height = 1920;

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const stops = style.bg.match(/#[a-fA-F0-9]{3,8}/g) || ["#667eea", "#764ba2"];
      stops.forEach((color, i) => grad.addColorStop(i / (stops.length - 1), color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Watermark logo
      ctx.font = "bold 52px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.textAlign = "center";
      ctx.fillText("Poptok", canvas.width / 2, 120);

      // Main text — word wrap
      ctx.fillStyle = style.color;
      ctx.font = "bold 72px -apple-system, sans-serif";
      ctx.textAlign = "center";
      const words = textContent.split(" ");
      const lineH = 90;
      let line = "";
      let y = canvas.height / 2 - (Math.ceil(textContent.length / 20) * lineH) / 2;
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > canvas.width - 120 && line) {
          ctx.fillText(line.trim(), canvas.width / 2, y);
          line = word + " ";
          y += lineH;
        } else {
          line = test;
        }
      }
      ctx.fillText(line.trim(), canvas.width / 2, y);

      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });

  // ─── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!user) { alert("Debes iniciar sesión para publicar."); return; }

    let fileBlob = null;
    let fileType = "";

    if (tab === "video" && videoFile) { fileBlob = videoFile; fileType = "video"; }
    else if (tab === "photo" && imageFile) { fileBlob = imageFile; fileType = "image"; }
    else if (tab === "text") {
      if (!textContent.trim()) { alert("Escribe algo antes de publicar."); return; }
      fileBlob = await generateTextImage();
      fileType = "image";
    } else {
      alert("Selecciona un archivo antes de publicar.");
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      const ext = fileType === "video" ? videoFile?.name.split(".").pop() || "mp4" : "jpg";
      const path = `${fileType}s/${uuidv4()}.${ext}`;
      const ref = storageRef(storage, path);

      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref, fileBlob);
        task.on("state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const url = await getDownloadURL(ref);
      const musicObj = MUSIC_TRACKS.find(m => m.id === selectedMusic);

      await addDoc(collection(db, "videos"), {
        userId: user.uid,
        username: user.displayName || "Anónimo",
        userPhotoURL: user.photoURL || null,
        fileUrl: url,
        fileType,
        aiFilter: selectedFilter !== "none" ? selectedFilter : null,
        createdAt: new Date().toISOString(),
        description: (description || textContent).trim(),
        interest: selectedInterest || "Random",
        likes: 0,
        favorites: 0,
        comments: [],
        allowDownload: allowDownload,
        musicUrl: musicObj ? (musicObj.url || null) : null,
        musicTitle: musicObj ? (musicObj.name || null) : null,
        subtitles: subtitlesList,
        reactionComment: reactionComment ? {
          text: reactionComment.text,
          username: reactionComment.username,
          parentVideoId: reactionComment.parentVideoId
        } : null,
      });

      if (clearReaction) clearReaction();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error al publicar: " + err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const hasContent = (tab === "video" && videoFile) ||
                     (tab === "photo" && imageFile) ||
                     (tab === "text" && textContent.trim().length > 0);

  const activeFilter = AI_FILTERS.find(f => f.id === selectedFilter);

  return (
    <div className="upload-modal-overlay" onClick={(e) => { if (e.target.classList.contains("upload-modal-overlay")) onUploadSuccess?.(); }}>
      <div className="upload-modal">
        {/* Header */}
        <div className="upload-modal-header">
          <h2 className="upload-modal-title">Nuevo post</h2>
          <button className="upload-modal-close" onClick={() => { if (clearReaction) clearReaction(); onUploadSuccess(); }}><FiX size={20} /></button>
        </div>

        {/* Tab selector */}
        <div className="upload-tabs">
          {[
            { id: "video", label: "Video", icon: <FiVideo size={16} /> },
            { id: "record", label: "Grabar", icon: <FiZap size={16} /> },
            { id: "photo", label: "Foto",  icon: <FiImage size={16} /> },
            { id: "text",  label: "Texto", icon: <FiType size={16} /> },
          ].map(t => (
            <button
              key={t.id}
              className={`upload-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => { setTab(t.id); clearSelection(); }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="upload-modal-body">
          {/* Reaction mode banner */}
          {reactionComment && (
            <div style={{
              background: "rgba(255, 0, 80, 0.15)",
              border: "1px solid rgba(255, 0, 80, 0.3)",
              borderRadius: "12px",
              padding: "10px 14px",
              marginBottom: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}>
              <span style={{ fontSize: "11px", color: "#ff0050", fontWeight: "bold", textTransform: "uppercase" }}>Modo Reacción</span>
              <span style={{ fontSize: "13px", color: "#fff" }}>Respondiendo a <strong>@{reactionComment.username}</strong>: "{reactionComment.text}"</span>
            </div>
          )}

          {/* ── Drop zone (video / photo tabs) ────────────── */}
          {(tab === "video" || tab === "photo") && (
            <>
              {!videoPreviewUrl && !imagePreviewUrl ? (
                <div
                  className={`upload-dropzone ${dragOver ? "drag-over" : ""}`}
                  onClick={openFilePicker}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <FiUploadCloud size={40} className="upload-dropzone-icon" />
                  <p className="upload-dropzone-text">
                    {tab === "video" ? "Arrastra tu video aquí" : "Arrastra tu foto aquí"}
                  </p>
                  <p className="upload-dropzone-sub">o haz clic para seleccionar</p>
                  <p className="upload-dropzone-hint">
                    {tab === "video" ? "MP4, MOV, AVI — máx. 100MB" : "JPG, PNG, WEBP — máx. 20MB"}
                  </p>
                </div>
              ) : (
                <div className="upload-preview-wrapper">
                  {tab === "video" && videoPreviewUrl && (
                    <video
                      src={videoPreviewUrl}
                      className="upload-preview-video"
                      style={{ filter: activeFilter?.filter || "" }}
                      controls
                      muted
                    />
                  )}
                  {tab === "photo" && imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      className="upload-preview-img"
                      style={{ filter: activeFilter?.filter || "" }}
                      alt="preview"
                    />
                  )}
                  <button className="upload-preview-clear" onClick={clearSelection}><FiX /></button>
                </div>
              )}

              {/* AI Filter toggle (only when file selected) */}
              {(videoPreviewUrl || imagePreviewUrl) && (
                <div className="upload-ai-section">
                  <button className="upload-ai-toggle" onClick={() => setShowAI(!showAI)}>
                    <FiZap size={14} /> IA · Filtros
                    <span className="upload-ai-badge">Beta</span>
                  </button>
                  {showAI && (
                    <div className="upload-ai-filters">
                      {AI_FILTERS.map(f => (
                        <button
                          key={f.id}
                          className={`upload-ai-chip ${selectedFilter === f.id ? "selected" : ""}`}
                          onClick={() => setSelectedFilter(f.id)}
                        >
                          {selectedFilter === f.id && <FiCheck size={11} />} {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Camera recording tab ───────────────────────── */}
          {tab === "record" && (
            <div className="upload-record-section" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <video
                ref={videoElementRef}
                style={{ display: "none" }}
                muted
                playsInline
              />

              <div style={{ position: "relative", width: "100%", maxWidth: "320px", height: "420px", borderRadius: "16px", overflow: "hidden", border: "2px solid #ff0050", boxShadow: "0 0 15px rgba(255,0,80,0.4)" }}>
                <canvas
                  ref={recordCanvasRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {recording && (
                  <div style={{ position: "absolute", top: "15px", left: "15px", display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "10px", color: "#fff", fontSize: "11px", fontWeight: "bold" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff0000", display: "inline-block", animation: "pulse 1s infinite" }} />
                    GRABANDO
                  </div>
                )}
              </div>

              <div style={{ width: "100%" }}>
                <label className="upload-field-label">🎭 Filtro de Cara (Emoji AR)</label>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "4px 0", scrollbarWidth: "none" }}>
                  {[
                    { id: "none", label: "Original" },
                    { id: "sunglasses", label: "🕶️ Gafas Cool" },
                    { id: "crown", label: "👑 Corona" },
                    { id: "hat", label: "🎩 Sombrero" },
                    { id: "mustache", label: "🧔 Bigote" },
                  ].map(filter => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSelectedSticker(filter.id)}
                      style={{
                        background: selectedSticker === filter.id ? "#ff0050" : "#222",
                        border: "none",
                        color: "#fff",
                        borderRadius: "15px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedSticker !== "none" && (
                <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#aaa", fontWeight: "bold" }}>Ajustar Posición del Filtro</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#ddd" }}>
                      <span>Posición Horizontal (X)</span>
                      <span>{stickerX}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={stickerX}
                      onChange={e => setStickerX(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "#ff0050" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#ddd" }}>
                      <span>Posición Vertical (Y)</span>
                      <span>{stickerY}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={stickerY}
                      onChange={e => setStickerY(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "#ff0050" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#ddd" }}>
                      <span>Escala / Tamaño</span>
                      <span>{stickerScale.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={stickerScale}
                      onChange={e => setStickerScale(parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#ff0050" }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: "10px" }}>
                {!recording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: "#ff0000",
                      border: "4px solid #fff",
                      boxShadow: "0 0 15px rgba(255, 0, 0, 0.6)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "12px",
                      background: "#ff0050",
                      border: "4px solid #fff",
                      boxShadow: "0 0 15px rgba(255, 0, 80, 0.6)",
                      cursor: "pointer",
                      animation: "pulse 1s infinite alternate"
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Text-as-image tab ─────────────────────────── */}
          {tab === "text" && (
            <div className="upload-text-section">
              {/* Preview canvas (hidden, used to generate image) */}
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Live preview */}
              <div
                className="upload-text-preview"
                style={{ background: AI_STYLES.find(s => s.id === selectedStyle)?.bg }}
              >
                <span
                  className="upload-text-preview-logo"
                  style={{ color: AI_STYLES.find(s => s.id === selectedStyle)?.color === "#000" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)" }}
                >
                  Poptok
                </span>
                <p
                  className="upload-text-preview-content"
                  style={{ color: AI_STYLES.find(s => s.id === selectedStyle)?.color }}
                >
                  {textContent || "Tu texto aparecerá aquí..."}
                </p>
              </div>

              <textarea
                className="upload-text-input"
                placeholder="Escribe tu mensaje, pensamiento, cita..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                maxLength={280}
                rows={3}
              />
              <p className="upload-text-counter">{textContent.length}/280</p>

              {/* Style selector */}
              <div className="upload-ai-section" style={{ marginTop: "8px" }}>
                <p className="upload-ai-label"><FiZap size={13} /> Estilo del fondo</p>
                <div className="upload-ai-filters">
                  {AI_STYLES.map(s => (
                    <button
                      key={s.id}
                      className={`upload-ai-chip ${selectedStyle === s.id ? "selected" : ""}`}
                      style={selectedStyle === s.id ? { background: s.bg, color: s.color, border: "none" } : {}}
                      onClick={() => setSelectedStyle(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Common fields ──────────────────────────────── */}
          <div className="upload-fields">
            {tab !== "text" && (
              <textarea
                className="upload-description"
                placeholder="Describe tu contenido, agrega hashtags... #trending"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
              />
            )}

            {/* Category */}
            <div className="upload-category-wrapper">
              <label className="upload-field-label">Categoría</label>
              <select
                className="upload-category-select"
                value={selectedInterest}
                onChange={e => setSelectedInterest(e.target.value)}
              >
                <option value="">— Selecciona una categoría —</option>
                {interestOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Music Selector with Preview */}
            <div className="upload-music-wrapper" style={{ marginTop: "12px" }}>
              <label className="upload-field-label">🎵 Música de fondo gratuita</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  className="upload-category-select"
                  value={selectedMusic}
                  onChange={handleMusicChange}
                  style={{ flex: 1 }}
                >
                  {MUSIC_TRACKS.map(track => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
                {selectedMusic !== "none" && (
                  <button
                    type="button"
                    onClick={togglePreviewMusic}
                    style={{
                      background: isPlayingPreview ? "#FF0050" : "#333",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    {isPlayingPreview ? "Pausar" : "Escuchar"}
                  </button>
                )}
              </div>
            </div>

            {/* Allow download option */}
            <div className="upload-download-toggle-wrapper" style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="allowDownload"
                checked={allowDownload}
                onChange={e => setAllowDownload(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="allowDownload" style={{ color: "#fff", fontSize: "14px", cursor: "pointer" }}>
                Permitir que otros usuarios descarguen este video/foto
              </label>
            </div>

            {/* Timed Subtitles Editor (Only for videos) */}
            {tab === "video" && (videoPreviewUrl || videoFile) && (
              <div className="upload-subtitles-editor" style={{ marginTop: "15px", borderTop: "1px solid #333", paddingTop: "12px" }}>
                <label className="upload-field-label">💬 Agregar Subtítulos al Video</label>
                
                {/* List of current subtitles */}
                {subtitlesList.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "10px 0", maxHeight: "100px", overflowY: "auto", background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "8px" }}>
                    {subtitlesList.map((sub, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                        <span style={{ color: "#aaa" }}>[{sub.start}s - {sub.end}s] <strong style={{ color: "#fff" }}>{sub.text}</strong></span>
                        <button type="button" onClick={() => handleRemoveSubtitle(idx)} style={{ background: "none", border: "none", color: "#ff0050", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Eliminar</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtitle Form */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexDirection: "column" }}>
                  <input
                    type="text"
                    placeholder="Texto del subtítulo (ej. Hola a todos)"
                    value={subText}
                    onChange={e => setSubText(e.target.value)}
                    style={{ background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: "#fff", fontSize: "13px", outline: "none" }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="number"
                      placeholder="Inicio (seg)"
                      value={subStart}
                      onChange={e => setSubStart(e.target.value)}
                      style={{ background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: "#fff", fontSize: "13px", outline: "none", flex: 1 }}
                      min="0"
                      step="0.5"
                    />
                    <input
                      type="number"
                      placeholder="Fin (seg)"
                      value={subEnd}
                      onChange={e => setSubEnd(e.target.value)}
                      style={{ background: "#222", border: "1px solid #333", borderRadius: "8px", padding: "8px", color: "#fff", fontSize: "13px", outline: "none", flex: 1 }}
                      min="0"
                      step="0.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubtitle}
                      style={{ background: "#ff0050", border: "none", borderRadius: "8px", color: "#fff", padding: "8px 16px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Upload progress ────────────────────────────── */}
          {loading && (
            <div className="upload-progress-bar-wrapper">
              <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
              <span className="upload-progress-label">{progress}%</span>
            </div>
          )}

          {/* ── Action buttons ─────────────────────────────── */}
          <div className="upload-actions">
            <button
              className="upload-publish-btn"
              onClick={handleUpload}
              disabled={loading || !hasContent}
            >
              {loading ? `Subiendo ${progress}%...` : "Publicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadVideo;
