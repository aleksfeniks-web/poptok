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

const UploadVideo = ({ onUploadSuccess }) => {
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

  // AI state
  const [showAI, setShowAI] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedStyle, setSelectedStyle] = useState("gradient");
  const [textContent, setTextContent] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState("none");
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

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
      });

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
          <button className="upload-modal-close" onClick={onUploadSuccess}><FiX size={20} /></button>
        </div>

        {/* Tab selector */}
        <div className="upload-tabs">
          {[
            { id: "video", label: "Video", icon: <FiVideo size={16} /> },
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
          {/* ── Drop zone (video / photo tabs) ────────────── */}
          {tab !== "text" && (
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
