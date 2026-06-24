import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { FiVideo, FiImage, FiType, FiUploadCloud, FiX, FiZap, FiCheck } from "react-icons/fi";

const interestOptions = [
  "Random", "Anime & Manga", "Latest News", "Humor", "Memes", "Gaming",
  "WTF", "Relationship & Dating", "Motor Vehicles", "Animals & Pets",
  "Science & Tech", "ASMR", "Sports", "Movies & TV", "Food & Drinks",
  "Lifestyle", "Superhero", "Crypto", "IA", "WoW"
];

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
  { id: "none", name: "Sin música de fondo", artist: "Nulo", genre: "None", url: "", coverGradient: "linear-gradient(135deg, #333, #555)" },
  { id: "lofi-1", name: "Sunset Dream Lofi", artist: "Chill & Lofi", genre: "Lofi", url: "https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3", coverGradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { id: "acoustic-1", name: "Acoustic Breeze", artist: "Acoustic & Folk", genre: "Acoustic", url: "https://cdn.pixabay.com/audio/2021/11/24/audio_82498b22da.mp3", coverGradient: "linear-gradient(135deg, #a8ff78, #78ffd6)" },
  { id: "cinematic-1", name: "Melancholic Piano", artist: "Cinematic & Piano", genre: "Cinematic", url: "https://cdn.pixabay.com/audio/2021/11/23/audio_035a943c87.mp3", coverGradient: "linear-gradient(135deg, #4facfe, #00f2fe)" },
  { id: "pop-1", name: "Summer Pop Upbeat", artist: "Upbeat & Pop", genre: "Pop", url: "https://cdn.pixabay.com/audio/2021/11/13/audio_cb4f1212a9.mp3", coverGradient: "linear-gradient(135deg, #ff0844, #ffb199)" },
  { id: "synth-1", name: "Future Retro Beat", artist: "Synthwave / Retro", genre: "Electronic", url: "https://cdn.pixabay.com/audio/2021/11/01/audio_00fa5593f3.mp3", coverGradient: "linear-gradient(135deg, #ff007f, #7f00ff)" },
  { id: "jazz-1", name: "Robot Gypsy Jazz", artist: "John Bartmann", genre: "Jazz", url: "https://cdn.pixabay.com/audio/2020/08/17/audio_613575b827.mp3", coverGradient: "linear-gradient(135deg, #f7971e, #ffd200)" },
  { id: "rock-1", name: "Indie Rock Energetic", artist: "Indie Rockers", genre: "Rock", url: "https://cdn.pixabay.com/audio/2021/07/27/audio_202082aa0b.mp3", coverGradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
  { id: "ambient-1", name: "Deep Meditation Ambient", artist: "Mindfulness", genre: "Ambient", url: "https://cdn.pixabay.com/audio/2021/07/22/audio_9584aae297.mp3", coverGradient: "linear-gradient(135deg, #302b63, #24243e)" },
  { id: "chillhop-1", name: "Coffee Shop Beats", artist: "Chillhop Network", genre: "Lofi", url: "https://cdn.pixabay.com/audio/2020/10/11/audio_746c5a0fb3.mp3", coverGradient: "linear-gradient(135deg, #85d7ff, #a3bded)" },
  { id: "dance-1", name: "EDM Party Starter", artist: "Dance Club", genre: "Electronic", url: "https://cdn.pixabay.com/audio/2021/12/11/audio_0ad0f9e437.mp3", coverGradient: "linear-gradient(135deg, #00c6ff, #0072ff)" },
  { id: "lofi-2", name: "Midnight Sleep Lofi", artist: "Lofi Sleeper", genre: "Lofi", url: "https://cdn.pixabay.com/audio/2021/08/08/audio_dc39bde808.mp3", coverGradient: "linear-gradient(135deg, #667eea, #764ba2)" }
];


const UploadVideo = ({ onUploadSuccess, reactionComment, clearReaction, userStatus }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("video"); // "video" | "photo" | "text" | "live"
  const [liveTitle, setLiveTitle] = useState("");
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

  // Pixabay Music Library state
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [searchMusicQuery, setSearchMusicQuery] = useState("");
  const [selectedMusicGenre, setSelectedMusicGenre] = useState("Todos");
  const [previewingMusicId, setPreviewingMusicId] = useState(null);

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
  const previewVideoRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => {
      unsub();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  // Sync preview video with background music
  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;

    if (selectedMusic === "none") {
      video.muted = false;
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      return;
    }

    const track = MUSIC_TRACKS.find(t => t.id === selectedMusic);
    if (!track || !track.url) return;

    let audio = previewAudioRef.current;
    if (!audio || audio.src !== track.url) {
      if (audio) audio.pause();
      audio = new Audio(track.url);
      audio.loop = true;
      previewAudioRef.current = audio;
    }

    const handlePlay = () => {
      video.muted = true;
      audio.play().catch(err => console.log("Blocked:", err));
    };

    const handlePause = () => {
      audio.pause();
    };

    const handleVolume = () => {
      audio.muted = video.muted;
      audio.volume = video.volume;
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolume);

    if (!video.paused) {
      video.muted = true;
      audio.play().catch(err => console.log(err));
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolume);
      audio.pause();
    };
  }, [selectedMusic, videoPreviewUrl]);

  const handleSelectMusic = (trackId) => {
    setSelectedMusic(trackId);
    // Stop preview if we select the track or if we click select
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingMusicId(null);
    setIsPlayingPreview(false);
    setShowMusicLibrary(false);
  };

  const handleRemoveMusic = () => {
    setSelectedMusic("none");
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingMusicId(null);
    setIsPlayingPreview(false);
  };

  const togglePreviewMusic = (trackId) => {
    const targetId = trackId || selectedMusic;
    const track = MUSIC_TRACKS.find(t => t.id === targetId);
    if (!track || !track.url) return;

    if (previewingMusicId === targetId || (targetId === selectedMusic && isPlayingPreview && previewingMusicId === null)) {
      // Pause
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingMusicId(null);
      setIsPlayingPreview(false);
    } else {
      // Play targetId
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      previewAudioRef.current = new Audio(track.url);
      previewAudioRef.current.loop = true;
      previewAudioRef.current.play()
        .then(() => {
          setPreviewingMusicId(targetId);
          if (targetId === selectedMusic) {
            setIsPlayingPreview(true);
          } else {
            setIsPlayingPreview(false);
          }
        })
        .catch(err => console.error("Error playing music preview:", err));
    }
  };

  const handleCloseMusicLibrary = () => {
    setShowMusicLibrary(false);
    // Stop preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewingMusicId(null);
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

  const handleStartLive = async () => {
    if (!user) {
      alert("Debes iniciar sesión para comenzar una transmisión.");
      return;
    }
    if (userStatus === "restricted") {
      alert("Acceso denegado: Tu cuenta tiene restricciones y no puedes transmitir.");
      return;
    }
    
    setLoading(true);
    try {
      const roomId = Math.random().toString(36).substring(7);
      // Create live document in Firestore
      const liveRef = doc(db, "lives", roomId);
      await setDoc(liveRef, {
        roomId,
        hostId: user.uid,
        hostName: user.displayName || user.email.split("@")[0] || "Creador Poptok",
        hostPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email.split("@")[0] || "U")}&background=ff0050&color=fff&bold=true`,
        title: liveTitle.trim() || "¡Transmisión en Vivo! 🔴",
        category: selectedInterest || "Random",
        status: "active",
        viewersCount: Math.floor(Math.random() * 15) + 5, // initial mock viewers count
        likes: 0,
        pinnedProduct: null,
        createdAt: new Date().toISOString()
      });

      // Redirect to countdown
      navigate(`/countdown/${roomId}`);
    } catch (err) {
      console.error("Error starting live stream:", err);
      alert("Error al iniciar la transmisión: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!user) { alert("Debes iniciar sesión para publicar."); return; }
    if (userStatus === "restricted") {
      alert("Acceso denegado: Tu cuenta tiene restricciones y no puedes subir videos.");
      return;
    }

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
        musicUrl: musicObj && musicObj.id !== "none" ? musicObj.url : null,
        musicTitle: musicObj && musicObj.id !== "none" ? `${musicObj.name} - ${musicObj.artist}` : null,
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
  const selectedTrackObj = MUSIC_TRACKS.find(t => t.id === selectedMusic);
  const isSelectedTrackPreviewing = previewingMusicId === selectedMusic || (selectedMusic !== "none" && isPlayingPreview && previewingMusicId === null);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("poptok-music-library-overlay")) {
      handleCloseMusicLibrary();
    }
  };

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
            { id: "live",  label: "En Vivo", icon: <span style={{ color: "#ff0050" }}>🔴</span> },
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
                      ref={previewVideoRef}
                      src={videoPreviewUrl}
                      className="upload-preview-video"
                      style={{ filter: activeFilter?.filter || "" }}
                      controls
                      muted={selectedMusic !== "none"}
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
          {tab !== "live" && (
            <>
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
                      <option key={opt} value={opt}>{CATEGORY_MAP[opt] || opt}</option>
                    ))}
                  </select>
                </div>

                {/* Music Selector with Preview */}
                <div className="upload-music-wrapper" style={{ marginTop: "12px" }}>
                  <label className="upload-field-label">🎵 Música de fondo (Pixabay)</label>
                  {selectedMusic === "none" ? (
                    <button
                      type="button"
                      className="poptok-music-select-trigger"
                      onClick={() => setShowMusicLibrary(true)}
                    >
                      <span className="poptok-music-icon-note">🎵</span> Elegir Música de Fondo Gratuita
                    </button>
                  ) : (
                    <div className="poptok-music-selected-card">
                      <div className="poptok-music-selected-cover" style={{ background: selectedTrackObj?.coverGradient || "linear-gradient(135deg, #ff0050, #ff6b35)" }}>
                        <span className={`poptok-music-selected-disc-icon ${isSelectedTrackPreviewing ? "spinning" : ""}`}>🎵</span>
                      </div>
                      <div className="poptok-music-selected-info">
                        <span className="poptok-music-selected-title">{selectedTrackObj?.name || "Música"}</span>
                        <span className="poptok-music-selected-artist-genre">
                          {selectedTrackObj?.artist || "Pixabay"} • <span className="poptok-music-selected-genre">{selectedTrackObj?.genre || "Gratis"}</span>
                        </span>
                      </div>
                      <div className="poptok-music-selected-actions">
                        <button
                          type="button"
                          className={`poptok-music-selected-play ${isSelectedTrackPreviewing ? "playing" : ""}`}
                          onClick={() => togglePreviewMusic(selectedMusic)}
                        >
                          {isSelectedTrackPreviewing ? "Pausar" : "Escuchar"}
                        </button>
                        <button
                          type="button"
                          className="poptok-music-selected-change"
                          onClick={() => setShowMusicLibrary(true)}
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          className="poptok-music-selected-remove"
                          onClick={handleRemoveMusic}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  )}
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
            </>
          )}

          {/* ── Live Stream creation form ─────────────────── */}
          {tab === "live" && (
            <div className="upload-live-section" style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "10px 0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="upload-field-label">Título del Live</label>
                <input
                  type="text"
                  className="upload-text-input"
                  placeholder="Ej. ¡Platicando con seguidores! 🔴"
                  value={liveTitle}
                  onChange={e => setLiveTitle(e.target.value)}
                  maxLength={60}
                  style={{ width: "100%", background: "#111", border: "1px solid #333", color: "#fff", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>
              
              <div className="upload-category-wrapper" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="upload-field-label">Categoría / Temática</label>
                <select
                  className="upload-category-select"
                  value={selectedInterest}
                  onChange={e => setSelectedInterest(e.target.value)}
                  style={{ width: "100%", background: "#111", border: "1px solid #333", color: "#fff", padding: "10px 14px", borderRadius: "10px", fontSize: "14px" }}
                >
                  <option value="">— Selecciona una categoría —</option>
                  {interestOptions.map(opt => (
                    <option key={opt} value={opt}>{CATEGORY_MAP[opt] || opt}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: "rgba(255, 0, 80, 0.05)", border: "1px solid rgba(255, 0, 80, 0.15)", borderRadius: "12px", padding: "12px", display: "flex", gap: "10px", alignItems: "center", marginTop: "10px" }}>
                <span style={{ fontSize: "20px" }}>🎥</span>
                <p style={{ margin: 0, fontSize: "12px", color: "#aaa", lineHeight: "1.4" }}>
                  Al iniciar la transmisión, utilizaremos tu cámara y micrófono. Tus seguidores recibirán una notificación para unirse a tu Live.
                </p>
              </div>

              <button
                className="upload-publish-btn"
                onClick={handleStartLive}
                disabled={loading}
                style={{ marginTop: "20px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              >
                {loading ? "Preparando..." : "🔴 Iniciar Transmisión en Vivo"}
              </button>
            </div>
          )}
        </div> {/* Ends upload-modal-body */}

        {/* ── Pixabay Music Library Modal ────────────────── */}
        {showMusicLibrary && (
          <div className="poptok-music-library-overlay" onClick={handleOverlayClick}>
            <div className="poptok-music-library-modal">
              <div className="poptok-music-library-header">
                <h3 className="poptok-music-library-title">🎵 Biblioteca de Música Pixabay</h3>
                <button
                  type="button"
                  className="poptok-music-library-close"
                  onClick={handleCloseMusicLibrary}
                >
                  ✖
                </button>
              </div>

              {/* Search Input */}
              <div className="poptok-music-search-wrapper">
                <input
                  type="text"
                  placeholder="Buscar por título, artista o género..."
                  className="poptok-music-search-input"
                  value={searchMusicQuery}
                  onChange={e => setSearchMusicQuery(e.target.value)}
                />
                {searchMusicQuery && (
                  <button
                    type="button"
                    className="poptok-music-search-clear"
                    onClick={() => setSearchMusicQuery("")}
                  >
                    ✖
                  </button>
                )}
              </div>

              {/* Genre Chips */}
              <div className="poptok-music-genre-chips">
                {["Todos", "Lofi", "Acoustic", "Cinematic", "Pop", "Electronic", "Jazz", "Ambient", "Rock"].map(genre => (
                  <button
                    key={genre}
                    type="button"
                    className={`poptok-music-genre-chip ${selectedMusicGenre === genre ? "active" : ""}`}
                    onClick={() => setSelectedMusicGenre(genre)}
                  >
                    {genre === "Todos" ? "🌍 Todos" : genre}
                  </button>
                ))}
              </div>

              {/* Music Tracks List */}
              <div className="poptok-music-tracks-list">
                {MUSIC_TRACKS
                  .filter(t => t.id !== "none") // Skip the "none" track in the modal
                  .filter(t => {
                    const query = searchMusicQuery.toLowerCase();
                    const matchQuery = t.name.toLowerCase().includes(query) ||
                                       t.artist.toLowerCase().includes(query) ||
                                       t.genre.toLowerCase().includes(query);
                    const matchGenre = selectedMusicGenre === "Todos" || t.genre === selectedMusicGenre;
                    return matchQuery && matchGenre;
                  })
                  .map(track => {
                    const isTrackPreviewing = previewingMusicId === track.id;
                    const isTrackSelected = selectedMusic === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`poptok-music-track-item ${isTrackSelected ? "selected" : ""}`}
                      >
                        <div className="poptok-music-track-cover" style={{ background: track.coverGradient }}>
                          {isTrackPreviewing ? (
                            <div className="poptok-music-equalizer">
                              <span className="eq-bar bar1"></span>
                              <span className="eq-bar bar2"></span>
                              <span className="eq-bar bar3"></span>
                            </div>
                          ) : (
                            <span className="poptok-music-disc-icon">🎵</span>
                          )}
                        </div>
                        <div className="poptok-music-track-details">
                          <span className="poptok-music-track-name">{track.name}</span>
                          <span className="poptok-music-track-artist-genre">
                            {track.artist} • <span className="poptok-music-track-genre-badge">{track.genre}</span>
                          </span>
                        </div>
                        <div className="poptok-music-track-actions">
                          <button
                            type="button"
                            className={`poptok-music-btn-preview ${isTrackPreviewing ? "playing" : ""}`}
                            onClick={() => togglePreviewMusic(track.id)}
                          >
                            {isTrackPreviewing ? "Pausar" : "Escuchar"}
                          </button>
                          <button
                            type="button"
                            className={`poptok-music-btn-select ${isTrackSelected ? "selected" : ""}`}
                            onClick={() => handleSelectMusic(track.id)}
                          >
                            {isTrackSelected ? "Seleccionado" : "Seleccionar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {MUSIC_TRACKS.filter(t => t.id !== "none").filter(t => {
                  const query = searchMusicQuery.toLowerCase();
                  const matchQuery = t.name.toLowerCase().includes(query) ||
                                     t.artist.toLowerCase().includes(query) ||
                                     t.genre.toLowerCase().includes(query);
                  const matchGenre = selectedMusicGenre === "Todos" || t.genre === selectedMusicGenre;
                  return matchQuery && matchGenre;
                }).length === 0 && (
                  <div className="poptok-music-no-results">
                    No se encontraron canciones para tu búsqueda.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadVideo;
