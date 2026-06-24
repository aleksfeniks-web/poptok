import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase.js";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { AiFillHeart, AiOutlineClose } from "react-icons/ai";
import { BsAward, BsCoin, BsGrid3X3Gap } from "react-icons/bs";
import { FaUserEdit, FaInstagram, FaTwitter, FaYoutube, FaPaypal, FaExternalLinkAlt, FaPen, FaSignOutAlt, FaShieldAlt, FaDownload, FaTrashAlt, FaUsers, FaUserCheck } from "react-icons/fa";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51TlyhWLq6Ijso4oiuQLReCiX9r1sQKZrMApvrWQlAxtLv189pKNC4mh5PZLaRkzAg2OL9MY5O2fj0M8VVZEQgtyD00cHuXVW4E");

import coin1 from "../assets/coin_1.svg";
import coin2 from "../assets/coin_2.svg";
import coin3 from "../assets/coin_3.svg";
import coin4 from "../assets/coin_4.svg";
import coin5 from "../assets/coin_5.svg";
import coin6 from "../assets/coin_6.svg";

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

const StripeDepositForm = ({ amount, onCancel, onSuccess, businessName, taxId, user, fetchUserData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    setIsProcessing(true);
    setErrorMessage("");

    try {
      // 1. Llamar al backend para crear el Payment Intent
      const paymentApiUrl = import.meta.env.VITE_PAYMENT_API_URL || "http://localhost:5000";
      const response = await fetch(`${paymentApiUrl}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), businessName })
      });

      if (!response.ok) {
        throw new Error("No se pudo iniciar la transacción con Stripe.");
      }

      const { clientSecret } = await response.json();

      // 2. Confirmar el pago en el cliente usando CardElement
      const cardElement = elements.getElement(CardElement);
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: businessName
          }
        }
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // 3. Acreditar saldo en Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentWallet = userSnap.data().businessWallet || 0;
          await updateDoc(userRef, {
            businessWallet: currentWallet + parseFloat(amount)
          });
        }
        
        await fetchUserData(user.uid);
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Error al procesar el pago.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="business-form" style={{ marginTop: "15px" }}>
      <div style={{ display: "flex", gap: "10px", margin: "5px 0 15px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "10px", justifyContent: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#00f2fe" }}>Pago Seguro con Tarjeta (Stripe)</span>
      </div>

      <div className="business-form-group">
        <label style={{ display: "block", marginBottom: "8px" }}>Datos de la Tarjeta *</label>
        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "8px",
          padding: "12px 15px",
          color: "white"
        }}>
          <CardElement options={{
            style: {
              base: {
                color: "#ffffff",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "15px",
                "::placeholder": { color: "#888888" }
              },
              invalid: {
                color: "#ff0050"
              }
            }
          }} />
        </div>
      </div>

      {errorMessage && (
        <p style={{ color: "#ff0050", fontSize: "12px", marginTop: "10px", textAlign: "center" }}>
          ❌ {errorMessage}
        </p>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isProcessing}
          className="business-submit-btn" 
          style={{ margin: 0, background: "#444" }}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="business-submit-btn" 
          disabled={isProcessing || !stripe}
          style={{ background: "linear-gradient(90deg, #00f2fe, #ff0050)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: 0, flex: 1 }}
        >
          {isProcessing ? "Procesando..." : `Pagar $${parseFloat(amount).toFixed(2)} USD`}
        </button>
      </div>
    </form>
  );
};

const Profile = ({ onSelectVideo }) => {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [instagramLink, setInstagramLink] = useState("");
  const [twitterLink, setTwitterLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [customLink, setCustomLink] = useState("");
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const [coinCounts, setCoinCounts] = useState({
    coin_1: 0,
    coin_2: 0,
    coin_3: 0,
    coin_4: 0,
    coin_5: 0,
    coin_6: 0,
    coin_7: 0
  });
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState(0);
  const [devWatchTime, setDevWatchTime] = useState(0);
  const [favoriteVideos, setFavoriteVideos] = useState([]);
  const [activeTab, setActiveTab] = useState("my-videos"); // "my-videos" | "favorites"
  const [showFollowModal, setShowFollowModal] = useState(null); // null | "followers" | "following"
  const [followUsersList, setFollowUsersList] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const videosRef = useRef(null);

  // Business / Enterprise Mode States
  const [userProfile, setUserProfile] = useState(null);
  const [showBusinessVerifyModal, setShowBusinessVerifyModal] = useState(false);
  const [businessVerifyStep, setBusinessVerifyStep] = useState(1);
  const [verifyForm, setVerifyForm] = useState({
    companyName: "",
    category: "Tecnología & Software",
    taxId: "",
    email: "",
    phone: "",
    website: ""
  });
  const [selectedDocName, setSelectedDocName] = useState("");
  const [showBusinessDashboard, setShowBusinessDashboard] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("wallet");
  const [depositModal, setDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("100");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositAmountFixed, setDepositAmountFixed] = useState(false);
  
  // Card mock fields
  const [creditCardNum, setCreditCardNum] = useState("");
  const [creditCardExpiry, setCreditCardExpiry] = useState("");
  const [creditCardCvc, setCreditCardCvc] = useState("");

  const [campaignsList, setCampaignsList] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    link: "",
    adType: "infeed",
    tags: "Tecnología & Software",
    budget: "50",
    imageUrl: ""
  });

  const [brandedOffer, setBrandedOffer] = useState({
    creatorId: "",
    amount: "500",
    description: ""
  });
  const [allCreatorsList, setAllCreatorsList] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);

  // Load campaigns and creators when Dashboard is open
  useEffect(() => {
    if (!user || !showBusinessDashboard) return;

    // Load campaigns from Firestore
    const qCampaigns = query(collection(db, "campaigns"), where("businessId", "==", user.uid));
    getDocs(qCampaigns).then((snap) => {
      setCampaignsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Load creators (excluding current user)
    getDocs(collection(db, "users")).then((snap) => {
      setAllCreatorsList(snap.docs
        .filter(d => d.id !== user.uid)
        .map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user, showBusinessDashboard]);


  const openFollowModal = async (type) => {
    setShowFollowModal(type);
    setLoadingFollowList(true);
    setFollowUsersList([]);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const uids = type === "followers" ? (data.followers || []) : (data.following || []);
        if (uids.length > 0) {
          const promises = uids.map(async (uid) => {
            const docSnap = await getDoc(doc(db, "users", uid));
            if (docSnap.exists()) {
              return { id: docSnap.id, ...docSnap.data() };
            }
            return { id: uid, name: "Usuario de Poptok", email: "Sin correo" };
          });
          const list = await Promise.all(promises);
          setFollowUsersList(list);
        }
      }
    } catch (err) {
      console.error("Error loading follow list:", err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const scrollToVideos = () => {
    setActiveTab("my-videos");
    videosRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setDisplayName(u.displayName || "Creador Poptok");
        await fetchUserData(u.uid);
        await fetchUserVideos(u.uid);
      } else {
        setUser(null);
        setUserVideos([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Registrar escuchas para compras nativas de Google Play en Android
  useEffect(() => {
    window.__poptokAndroidPurchaseSuccess = async (amount, orderId) => {
      if (!user) return;
      setIsPurchasing(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const currentCoins = data.coins || 0;
          const currentCounts = data.coinCounts || {
            coin_1: currentCoins,
            coin_2: 0,
            coin_3: 0,
            coin_4: 0,
            coin_5: 0,
            coin_6: 0
          };

          currentCounts.coin_6 = (currentCounts.coin_6 || 0) + amount;

          await updateDoc(userRef, {
            coins: currentCoins + amount,
            coinCounts: currentCounts
          });

          setPurchasedAmount(amount);
          setPurchaseSuccess(true);
          await fetchUserData(user.uid);
        }
      } catch (error) {
        console.error("Error al procesar compra de Google Play en Firestore:", error);
        alert("Pago exitoso en Google Play, pero falló la acreditación en Firestore. Contacta a soporte.");
      } finally {
        setIsPurchasing(false);
      }
    };

    window.__poptokAndroidPurchaseError = (errorMsg) => {
      setIsPurchasing(false);
      alert("Error en la compra con Google Play: " + errorMsg);
    };

    return () => {
      delete window.__poptokAndroidPurchaseSuccess;
      delete window.__poptokAndroidPurchaseError;
    };
  }, [user]);

  const fetchUserData = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserProfile(data);
        setCoins(data.coins || 0);
        setHighScore(data.highScore || 0);
        setPaypalEmail(data.paypalEmail || "");
        const social = data.socialLinks || {};
        setInstagramLink(social.instagram || "");
        setTwitterLink(social.twitter || "");
        setYoutubeLink(social.youtube || "");
        setCustomLink(social.custom || "");
        setFollowersCount(Array.isArray(data.followers) ? data.followers.length : 0);
        setFollowingCount(Array.isArray(data.following) ? data.following.length : 0);
        
        // Cargar coinCounts y hacer fallback si no existen, migrando las existentes
        setCoinCounts(data.coinCounts || {
          coin_1: data.coins || 0,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        });

        // Obtener videos favoritos
        await fetchFavoriteVideos(uid, data.favorites || []);
      }
    } catch (err) {
      console.error("Error al obtener datos de perfil en Firestore:", err);
    }
  };

  const fetchFavoriteVideos = async (uid, favoritesArray) => {
    if (!favoritesArray || favoritesArray.length === 0) {
      setFavoriteVideos([]);
      return;
    }

    try {
      const loaded = await Promise.all(
        favoritesArray.map(async (vidId) => {
          if (vidId.startsWith("demo-")) {
            const demoVideo = PEXELS_DEMO_VIDEOS.find((v) => v.riuzaki1234 === vidId);
            return demoVideo || null;
          } else {
            const videoRef = doc(db, "videos", vidId);
            const videoSnap = await getDoc(videoRef);
            if (videoSnap.exists()) {
              return { riuzaki1234: videoSnap.id, ...videoSnap.data() };
            }
          }
          return null;
        })
      );
      setFavoriteVideos(loaded.filter((v) => v !== null));
    } catch (err) {
      console.error("Error al obtener videos favoritos:", err);
    }
  };

  const handleBuyGems = async (amount) => {
    if (!user) return;
    setIsPurchasing(true);

    // Si estamos dentro del WebView de la app de Android, llamar al método nativo de Google Play Billing
    if (window.PoptokAndroid && typeof window.PoptokAndroid.buyGems === "function") {
      try {
        window.PoptokAndroid.buyGems(amount);
      } catch (err) {
        console.error("Error al llamar Google Play Billing nativo:", err);
        setIsPurchasing(false);
        alert("Error al iniciar Google Play Billing.");
      }
      return;
    }

    // Simulación / Fallback en Web normal
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simular pasarela segura
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentCoins = data.coins || 0;
        const currentCounts = data.coinCounts || {
          coin_1: currentCoins,
          coin_2: 0,
          coin_3: 0,
          coin_4: 0,
          coin_5: 0,
          coin_6: 0
        };

        currentCounts.coin_6 = (currentCounts.coin_6 || 0) + amount;

        await updateDoc(userRef, {
          coins: currentCoins + amount,
          coinCounts: currentCounts
        });

        setPurchasedAmount(amount);
        setPurchaseSuccess(true);
        await fetchUserData(user.uid);
      }
    } catch (error) {
      console.error("Error al comprar gemas doradas:", error);
      alert("Error al procesar la compra.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSimulateWatchTime = () => {
    const cur = Number(localStorage.getItem("poptok_cumulative_watch_time") || 0);
    const next = cur + 36000; // +10 horas
    localStorage.setItem("poptok_cumulative_watch_time", next);
    setDevWatchTime(next);
    alert(`⏳ Watch time simulado: +10 Horas. Total acumulado: ${(next / 3600).toFixed(1)} horas.`);
  };

  // Cargar devWatchTime al iniciar
  useEffect(() => {
    setDevWatchTime(Number(localStorage.getItem("poptok_cumulative_watch_time") || 0));
  }, []);

  const fetchUserVideos = async (uid) => {
    try {
      const videosRef = collection(db, "videos");
      const q = query(videosRef, where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      
      const videos = querySnapshot.docs.map((doc) => ({
        riuzaki1234: doc.id,
        ...doc.data()
      }));
      
      // Sort manually by createdAt desc since composite indexes might not be built yet
      videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setUserVideos(videos);
    } catch (err) {
      console.error("Error al obtener videos del usuario en Firestore:", err);
    }
  };

  // Business Account Helper Functions
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (businessVerifyStep === 1) {
      if (!verifyForm.companyName || !verifyForm.taxId) {
        alert("Por favor completa los campos requeridos.");
        return;
      }
      setBusinessVerifyStep(2);
    } else if (businessVerifyStep === 2) {
      if (!verifyForm.email || !verifyForm.phone) {
        alert("Por favor completa la información de contacto.");
        return;
      }
      setBusinessVerifyStep(3);
    } else if (businessVerifyStep === 3) {
      if (!selectedDocName) {
        alert("Por favor selecciona un documento de verificación.");
        return;
      }
      setBusinessVerifyStep(4);
      // Simular verificación de IA y registros comerciales durante 2.5 segundos
      setTimeout(async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const businessData = {
            isBusiness: true,
            businessStatus: "verified",
            businessWallet: 100.00, // ¡Saldo inicial de regalo de $100 USD!
            businessInfo: {
              ...verifyForm,
              documentName: selectedDocName,
              verifiedAt: new Date().toISOString()
            }
          };
          await updateDoc(userRef, businessData);
          setBusinessVerifyStep(5);
          await fetchUserData(user.uid);
        } catch (err) {
          console.error("Error setting business status:", err);
          alert("Error en el servidor al verificar.");
          setBusinessVerifyStep(3);
        }
      }, 2500);
    }
  };

  const handleStripeDeposit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Por favor ingresa un monto válido.");
      return;
    }
    if (!creditCardNum || !creditCardExpiry || !creditCardCvc) {
      alert("Por favor ingresa la información de tu tarjeta.");
      return;
    }
    setIsDepositing(true);
    try {
      // Simular retraso de pasarela de pago Stripe/PayPal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const userRef = doc(db, "users", user.uid);
      const currentWallet = userProfile?.businessWallet || 0;
      const newWallet = currentWallet + amt;
      await updateDoc(userRef, {
        businessWallet: newWallet
      });

      // Generar factura B2B
      const invId = "INV-" + Math.floor(Math.random() * 900000 + 100000);
      setInvoiceData({
        id: invId,
        companyName: userProfile?.businessInfo?.businessName || verifyForm.companyName || "Empresa Poptok",
        taxId: userProfile?.businessInfo?.taxId || verifyForm.taxId || "XAXX010101000",
        amount: amt,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        method: "Stripe Card (**** **** **** " + creditCardNum.slice(-4) + ")",
        authCode: "AUTH-" + Math.floor(Math.random() * 1000000)
      });

      setDepositSuccess(true);
      await fetchUserData(user.uid);
    } catch (err) {
      console.error("Error depositing:", err);
      alert("Error al procesar el pago.");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    const budget = parseFloat(newCampaign.budget);
    if (!newCampaign.title || !newCampaign.link || isNaN(budget) || budget <= 0) {
      alert("Por favor completa los campos requeridos.");
      return;
    }

    const currentWallet = userProfile?.businessWallet || 0;
    if (currentWallet < budget) {
      alert("No tienes saldo suficiente en tu billetera virtual. Por favor recarga.");
      return;
    }

    try {
      // 1. Descontar de la billetera virtual
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        businessWallet: Math.max(0, currentWallet - budget)
      });

      // 2. Crear documento de campaña
      const predefImages = [
        "https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=600"
      ];
      const imgUrl = newCampaign.imageUrl || predefImages[Math.floor(Math.random() * predefImages.length)];

      await addDoc(collection(db, "campaigns"), {
        businessId: user.uid,
        businessName: userProfile?.businessInfo?.businessName || user.displayName || "Empresa Poptok",
        title: newCampaign.title,
        description: newCampaign.description,
        link: newCampaign.link,
        adType: newCampaign.adType,
        tags: newCampaign.tags,
        budget: budget,
        remainingBudget: budget,
        costPerView: newCampaign.adType === "takeover" ? 0.25 : 0.05,
        costPerClick: newCampaign.adType === "takeover" ? 0.50 : 0.15,
        imageUrl: imgUrl,
        viewsCount: 0,
        clicksCount: 0,
        status: "active",
        createdAt: new Date().toISOString()
      });

      alert("🚀 ¡Campaña creada y publicada con éxito!");
      setNewCampaign({
        title: "",
        description: "",
        link: "",
        adType: "infeed",
        tags: "Tecnología & Software",
        budget: "50",
        imageUrl: ""
      });

      // Recargar campañas
      const q = query(collection(db, "campaigns"), where("businessId", "==", user.uid));
      const snap = await getDocs(q);
      setCampaignsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      await fetchUserData(user.uid);
    } catch (err) {
      console.error("Error creating campaign:", err);
      alert("Error al crear campaña.");
    }
  };

  const handleSendBrandedOffer = async (e) => {
    e.preventDefault();
    const amount = parseFloat(brandedOffer.amount);
    if (!brandedOffer.creatorId || isNaN(amount) || amount <= 0 || !brandedOffer.description) {
      alert("Por favor completa los campos de la propuesta.");
      return;
    }

    const currentWallet = userProfile?.businessWallet || 0;
    if (currentWallet < amount) {
      alert("No tienes saldo suficiente en tu billetera virtual. Por favor recarga.");
      return;
    }

    try {
      // 1. Retener fondos en garantía/escrow
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        businessWallet: Math.max(0, currentWallet - amount)
      });

      // 2. Crear notificación para el creador
      await addDoc(collection(db, "activity_notifications"), {
        userId: brandedOffer.creatorId,
        type: "branded_offer",
        senderId: user.uid,
        senderName: userProfile?.businessInfo?.businessName || user.displayName || "Empresa Poptok",
        offerAmount: amount,
        offerDesc: brandedOffer.description,
        timestamp: new Date().toISOString(),
        read: false
      });

      // 3. Crear mensaje de chat directo
      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        receiverId: brandedOffer.creatorId,
        text: `🤝 ¡Hola! Te he enviado una propuesta de Contenido Patrocinado por $${amount} USD. Detalles: "${brandedOffer.description}". Por favor revisa tu bandeja de entrada de Actividad para aceptar.`,
        timestamp: new Date(),
        read: false
      });

      alert("🤝 ¡Propuesta enviada con éxito y fondos retenidos en garantía! Se ha notificado al creador.");
      setBrandedOffer({
        creatorId: "",
        amount: "500",
        description: ""
      });
      await fetchUserData(user.uid);
    } catch (err) {
      console.error("Error sending branded offer:", err);
      alert("Error al enviar la propuesta.");
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;

    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: displayName.trim()
      });

      // 2. Update Firestore User Document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: displayName.trim(),
        paypalEmail: paypalEmail.trim(),
        socialLinks: {
          instagram: instagramLink.trim(),
          twitter: twitterLink.trim(),
          youtube: youtubeLink.trim(),
          custom: customLink.trim()
        }
      });

      setIsEditing(false);
      alert("✅ ¡Perfil actualizado correctamente!");
    } catch (error) {
      console.error("Error al guardar perfil:", error);
      alert("Error al actualizar el perfil.");
    }
  };

  const handleExportData = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      let userData = {};
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
      }

      const videosQuery = query(collection(db, "videos"), where("userId", "==", auth.currentUser.uid));
      const videosSnap = await getDocs(videosQuery);
      const videosData = videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const productsQuery = query(collection(db, "products"), where("sellerId", "==", auth.currentUser.uid));
      const productsSnap = await getDocs(productsQuery);
      const productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const fullData = {
        perfil: {
          uid: auth.currentUser.uid,
          nombre: auth.currentUser.displayName,
          correo: auth.currentUser.email,
          ...userData
        },
        videos: videosData,
        articulos_tienda: productsData,
        nota_legal: "Esta exportación de datos personales se entrega en cumplimiento con el derecho de Acceso conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México."
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `mis_datos_poptok_${auth.currentUser.uid}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      alert("✅ Tus datos personales han sido exportados y descargados correctamente.");
    } catch (err) {
      console.error("Error exporting user data:", err);
      alert("Ocurrió un error al exportar tus datos: " + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    const confirmDelete = window.confirm(
      "⚠️ ¿Estás seguro de que deseas eliminar tu cuenta permanentemente?\n\nDe acuerdo con tu derecho de Cancelación bajo la LFPDPPP, todos tus datos personales, perfil, videos subidos y artículos en venta serán eliminados permanentemente de nuestros servidores activos de inmediato. Esta acción no se puede deshacer."
    );
    if (!confirmDelete) return;

    try {
      const uid = auth.currentUser.uid;
      
      const videosQuery = query(collection(db, "videos"), where("userId", "==", uid));
      const videosSnap = await getDocs(videosQuery);
      const deleteVideoPromises = videosSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteVideoPromises);

      const productsQuery = query(collection(db, "products"), where("sellerId", "==", uid));
      const productsSnap = await getDocs(productsQuery);
      const deleteProductPromises = productsSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteProductPromises);

      await deleteDoc(doc(db, "users", uid));

      alert("✅ Tu cuenta y todos tus datos personales han sido eliminados de acuerdo con la LFPDPPP. Sesión cerrada.");
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error("Error deleting user account:", err);
      alert("Ocurrió un error al eliminar tu cuenta: " + err.message);
    }
  };

  const handleSignOut = async () => {
    try {
      if (window.PoptokAndroid && typeof window.PoptokAndroid.signOutGoogle === 'function') {
        window.PoptokAndroid.signOutGoogle();
      }
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("Error al cerrar sesión.");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const path = `avatars/${user.uid}.png`;
      const ref = storageRef(storage, path);
      
      await uploadBytes(ref, file);
      const downloadUrl = await getDownloadURL(ref);

      // 1. Update auth photoURL
      await updateProfile(user, { photoURL: downloadUrl });
      
      // 2. Update firestore doc
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { profilePic: downloadUrl });

      // Force re-render of local state
      setUser({ ...auth.currentUser, photoURL: downloadUrl });
      alert("✅ ¡Foto de perfil actualizada!");
    } catch (err) {
      console.error("Error al subir foto de perfil:", err);
      alert("Error al subir la imagen: " + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "#aaa" }}>Cargando perfil del creador...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <p style={{ color: "#aaa", fontSize: "16px" }}>⚠️ Por favor, inicia sesión para ver tu perfil de creador.</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Tarjeta de Encabezado de Perfil */}
      <div className="profile-header-card">
        <div className="profile-avatar-large-wrapper" onClick={() => avatarInputRef.current?.click()} style={{ cursor: "pointer", position: "relative" }}>
          <img
            src={user.photoURL || "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"}
            alt="Avatar"
            className="profile-avatar-large"
          />
          {uploadingAvatar ? (
            <div className="avatar-upload-overlay">Subiendo...</div>
          ) : (
            <div className="avatar-upload-overlay">
              <FaUserEdit size={16} />
            </div>
          )}
          <input
            type="file"
            ref={avatarInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </div>

        {isEditing ? (
            <div className="profile-edit-section">
              <label className="profile-edit-label">Nombre de Usuario</label>
              <input
                type="text"
                className="profile-edit-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nombre de Usuario"
                maxLength={20}
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Paypal Email (para recibir donaciones)</label>
              <input
                type="email"
                className="profile-edit-input"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="correo@paypal.com"
                maxLength={50}
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Enlace de Instagram</label>
              <input
                type="url"
                className="profile-edit-input"
                value={instagramLink}
                onChange={(e) => setInstagramLink(e.target.value)}
                placeholder="https://instagram.com/usuario"
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Enlace de X / Twitter</label>
              <input
                type="url"
                className="profile-edit-input"
                value={twitterLink}
                onChange={(e) => setTwitterLink(e.target.value)}
                placeholder="https://x.com/usuario"
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Enlace de YouTube</label>
              <input
                type="url"
                className="profile-edit-input"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="https://youtube.com/@usuario"
              />
              <label className="profile-edit-label" style={{ marginTop: "10px", display: "block" }}>Sitio Web / Linktree</label>
              <input
                type="url"
                className="profile-edit-input"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="https://miweb.com"
              />
              <button className="profile-save-button" onClick={handleSaveProfile} style={{ marginTop: "15px" }}>
                Guardar Cambios
              </button>
              <button
                className="profile-save-button"
                style={{ background: "#444", marginTop: "5px" }}
                onClick={() => {
                  setDisplayName(user.displayName || "Creador Poptok");
                  fetchUserData(user.uid);
                  setIsEditing(false);
                }}
              >
                Cancelar
              </button>
            </div>
        ) : (
          <>
            <h2 className="profile-name-title" style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
              {user.displayName || "Creador Poptok"}
              {userProfile?.isBusiness && userProfile?.businessStatus === "verified" && (
                <span className="business-badge-verified" title="Empresa Verificada">🏢 Verificado</span>
              )}
            </h2>
            <p className="profile-email-sub">{user.email}</p>
            <div className="profile-social-links" style={{ display: "flex", gap: "14px", justifyContent: "center", marginTop: "10px" }}>
              {instagramLink && (
                <a href={instagramLink} target="_blank" rel="noopener noreferrer" style={{ color: "#e1306c", display: "flex", alignItems: "center" }}>
                  <FaInstagram size={22} />
                </a>
              )}
              {twitterLink && (
                <a href={twitterLink} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", display: "flex", alignItems: "center" }}>
                  <FaTwitter size={22} />
                </a>
              )}
              {youtubeLink && (
                <a href={youtubeLink} target="_blank" rel="noopener noreferrer" style={{ color: "#ff0000", display: "flex", alignItems: "center" }}>
                  <FaYoutube size={22} />
                </a>
              )}
              {paypalEmail && (
                <a href={`https://www.paypal.com/donate?business=${paypalEmail}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0070ba", display: "flex", alignItems: "center" }}>
                  <FaPaypal size={22} />
                </a>
              )}
              {customLink && (
                <a href={customLink} target="_blank" rel="noopener noreferrer" style={{ color: "#00f2fe", display: "flex", alignItems: "center" }}>
                  <FaExternalLinkAlt size={20} />
                </a>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", marginTop: "15px", width: "100%", maxWidth: "320px", margin: "15px auto 0" }}>
              <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center" }}>
                <button onClick={() => setIsEditing(true)} className="profile-action-btn" style={{ flex: 1 }}>
                  <FaPen size={12} /> Editar Perfil
                </button>
                <button onClick={handleSignOut} className="profile-action-btn logout" style={{ flex: 1 }}>
                  <FaSignOutAlt size={12} /> Cerrar Sesión
                </button>
              </div>
              
              {userProfile?.isBusiness && userProfile?.businessStatus === "verified" ? (
                <button 
                  onClick={() => setShowBusinessDashboard(true)} 
                  className="profile-action-btn" 
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, #00f2fe, #ff0050)",
                    color: "white",
                    border: "none",
                    boxShadow: "0 4px 15px rgba(255, 0, 80, 0.4)",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  📊 Dashboard de Anuncios
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setBusinessVerifyStep(1);
                    setSelectedDocName("");
                    setShowBusinessVerifyModal(true);
                  }} 
                  className="profile-action-btn" 
                  style={{
                    width: "100%",
                    border: "1.5px solid #00f2fe",
                    color: "#00f2fe",
                    background: "rgba(0, 242, 254, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  🏢 Convertir a Cuenta de Empresa
                </button>
              )}
            </div>

            {/* Sección LFPDPPP / Derechos ARCO */}
            <div className="arco-section">
              <h4 className="arco-title">
                <FaShieldAlt size={14} style={{ color: "#00f2fe" }} /> Privacidad y Derechos ARCO
              </h4>
              <p className="arco-desc">
                Ejerce tus derechos ARCO (LFPDPPP México) para acceder o borrar tus datos.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", width: "100%" }}>
                <button onClick={handleExportData} className="arco-btn">
                  <FaDownload size={12} /> Acceso: Bajar mis Datos
                </button>
                <button onClick={handleDeleteAccount} className="arco-btn delete">
                  <FaTrashAlt size={12} /> Cancelar Cuenta
                </button>
              </div>
            </div>
          </>
        )}

        {/* Fila de Estadísticas */}
        <div className="profile-stats-row">
          <div className="profile-stat-card gemas" onClick={() => { setPurchaseSuccess(false); setShowPurchaseModal(true); }}>
            <div className="profile-stat-icon">💎</div>
            <span className="profile-stat-label">Gemas</span>
            <span className="profile-stat-value">{coins}</span>
          </div>
          <div className="profile-stat-card seguidores" onClick={() => openFollowModal("followers")}>
            <div className="profile-stat-icon">
              <FaUsers size={22} />
            </div>
            <span className="profile-stat-label">Seguidores</span>
            <span className="profile-stat-value">{followersCount}</span>
          </div>
          <div className="profile-stat-card seguidos" onClick={() => openFollowModal("following")}>
            <div className="profile-stat-icon">
              <FaUserCheck size={20} />
            </div>
            <span className="profile-stat-label">Seguidos</span>
            <span className="profile-stat-value">{followingCount}</span>
          </div>
          <div className="profile-stat-card videos" onClick={scrollToVideos}>
            <div className="profile-stat-icon">
              <BsGrid3X3Gap size={18} />
            </div>
            <span className="profile-stat-label">Videos</span>
            <span className="profile-stat-value">{userVideos.length}</span>
          </div>
        </div>
      </div>

      {/* Control de Testing de Tiempo de Reproducción: solo visible para el admin support@poptok.app */}
      {user.email?.toLowerCase() === "support@poptok.app" && (
        <div className="profile-sim-bar">
          <div>
            ⏱️ Tiempo de reproducción acumulado: <strong style={{ color: "#00ffff" }}>{(devWatchTime / 3600).toFixed(2)} horas</strong> ({devWatchTime} segundos)
          </div>
          <button onClick={handleSimulateWatchTime} className="profile-sim-btn">
            ⚙️ Simular +10 Horas
          </button>
        </div>
      )}

      {/* Sección de Inventario de Gemas */}
      <div className="profile-gems-section" style={{
        marginTop: "20px",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "16px",
        padding: "20px",
        border: "1px solid rgba(255, 255, 255, 0.08)"
      }}>
        <h3 style={{
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom: "15px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#fff"
        }}>
          💎 Mi Inventario de Gemas (Poptok Coins)
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
          gap: "10px"
        }}>
          {[
            { id: 1, name: "Gema Rosa", img: coin1, desc: "Común (Ver videos)", color: "#FF69B4" },
            { id: 2, name: "Gema Naranja", img: coin2, desc: "Poco común (2h)", color: "#FF8C00" },
            { id: 3, name: "Gema Verde", img: coin3, desc: "Rara (6h)", color: "#32CD32" },
            { id: 4, name: "Gema Púrpura", img: coin4, desc: "Épica (16h)", color: "#BA55D3" },
            { id: 5, name: "Gema Azul", img: coin5, desc: "Legendaria (40h)", color: "#1E90FF" },
            { id: 6, name: "Gema Dorada", img: coin6, desc: "Dinero Real", color: "#FFD700", isGolden: true }
          ].map((gem) => {
            const count = coinCounts[`coin_${gem.id}`] || 0;
            return (
              <div key={gem.id} style={{
                background: "rgba(255, 255, 255, 0.04)",
                borderRadius: "12px",
                padding: "8px 6px",
                textAlign: "center",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "4px",
                transition: "transform 0.2s"
              }} className="gem-inventory-card">
                <img
                  src={gem.img}
                  alt={gem.name}
                  className="rotating-gem"
                  style={{
                    width: "24px",
                    height: "24px",
                    "--glow-color": gem.color
                  }}
                />
                <div style={{ fontWeight: "bold", fontSize: "11px", color: gem.color }}>
                  {gem.name}
                </div>
                <div style={{ fontSize: "8px", color: "#888", minHeight: "22px", lineHeight: "1.1" }}>
                  {gem.desc}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
                  x{count}
                </div>
                {gem.isGolden && (
                  <button
                    onClick={() => {
                      setPurchaseSuccess(false);
                      setShowPurchaseModal(true);
                    }}
                    style={{
                      background: "linear-gradient(45deg, #FFD700, #FFA500)",
                      border: "none",
                      borderRadius: "12px",
                      padding: "4px 8px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      color: "#000",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(255, 215, 0, 0.2)",
                      transition: "transform 0.1s",
                      marginTop: "2px"
                    }}
                    className="gem-buy-btn"
                  >
                    Comprar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selector de pestañas */}
      <div ref={videosRef} style={{
        display: "flex",
        justifyContent: "center",
        borderBottom: "1px solid #333",
        marginTop: "30px",
        marginBottom: "20px",
        gap: "40px"
      }}>
        <button
          onClick={() => setActiveTab("my-videos")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "my-videos" ? "2px solid #ff0050" : "2px solid transparent",
            color: activeTab === "my-videos" ? "#ff0050" : "#888",
            fontSize: "16px",
            fontWeight: "bold",
            paddingBottom: "10px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          📽️ Mis Videos ({userVideos.length})
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "favorites" ? "2px solid #ffbb00" : "2px solid transparent",
            color: activeTab === "favorites" ? "#ffbb00" : "#888",
            fontSize: "16px",
            fontWeight: "bold",
            paddingBottom: "10px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          ⭐ Mis Favoritos ({favoriteVideos.length})
        </button>
      </div>

      {/* Grid de videos según la pestaña seleccionada */}
      {activeTab === "my-videos" ? (
        userVideos.length === 0 ? (
          <p className="profile-no-videos" style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No has subido ningún video todavía. ¡Comparte tu primer video!
          </p>
        ) : (
          <div className="profile-videos-grid">
            {userVideos.map((video) => (
              <div
                key={video.riuzaki1234}
                className="profile-video-card"
                onClick={() => setSelectedVideo(video)}
              >
                {video.fileType === "image" ? (
                  <img className="profile-video-thumbnail" src={video.fileUrl} alt="thumbnail" style={{ objectFit: "cover" }} />
                ) : (
                  <video className="profile-video-thumbnail" muted preload="metadata">
                    <source src={video.fileUrl} type="video/mp4" />
                  </video>
                )}
                <div className="profile-video-likes-badge">
                  <AiFillHeart /> {video.likes || 0}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        favoriteVideos.length === 0 ? (
          <p className="profile-no-videos" style={{ textAlign: "center", color: "#666", padding: "20px" }}>
            No tienes ningún video guardado en favoritos todavía.
          </p>
        ) : (
          <div className="profile-videos-grid">
            {favoriteVideos.map((video) => (
              <div
                key={video.riuzaki1234}
                className="profile-video-card"
                onClick={() => setSelectedVideo(video)}
              >
                {video.fileType === "image" ? (
                  <img className="profile-video-thumbnail" src={video.fileUrl} alt="thumbnail" style={{ objectFit: "cover" }} />
                ) : (
                  <video className="profile-video-thumbnail" muted preload="metadata">
                    <source src={video.fileUrl} type="video/mp4" />
                  </video>
                )}
                <div className="profile-video-likes-badge">
                  <AiFillHeart style={{ color: "#ff0050" }} /> {video.likes || 0}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Reproductor de Videos del Perfil */}
      {selectedVideo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px"
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "450px",
              height: "80vh",
              background: "#000",
              borderRadius: "15px",
              overflow: "hidden",
              border: "1px solid #333"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                color: "white",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10
              }}
              onClick={() => setSelectedVideo(null)}
            >
              <AiOutlineClose style={{ fontSize: "20px" }} />
            </button>

             {selectedVideo.fileType === "image" ? (
               <img
                 src={selectedVideo.fileUrl}
                 style={{ width: "100%", height: "100%", objectFit: "cover" }}
                 alt="Post content"
               />
             ) : (
               <video
                 src={selectedVideo.fileUrl}
                 style={{ width: "100%", height: "100%", objectFit: "cover" }}
                 controls
                 autoPlay
                 loop
               />
             )}

            {user && selectedVideo.userId === user.uid && !selectedVideo.isPexels && (
              <button
                style={{
                  position: "absolute",
                  bottom: "20px",
                  right: "20px",
                  background: "rgba(255, 0, 80, 0.9)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  zIndex: 10
                }}
                onClick={async () => {
                  if (window.confirm("¿Estás seguro de que deseas eliminar este video permanentemente?")) {
                    try {
                      const videoRef = doc(db, "videos", selectedVideo.riuzaki1234);
                      await deleteDoc(videoRef);
                      setUserVideos((prev) => prev.filter((v) => v.riuzaki1234 !== selectedVideo.riuzaki1234));
                      setSelectedVideo(null);
                      alert("Video eliminado correctamente.");
                    } catch (err) {
                      console.error("Error al eliminar video:", err);
                      alert("No se pudo eliminar el video.");
                    }
                  }
                }}
              >
                Eliminar Video
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de compra de gemas doradas */}
      {showPurchaseModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }} onClick={() => !isPurchasing && setShowPurchaseModal(false)}>
          <div style={{
            width: "90%",
            maxWidth: "380px",
            background: "#18181c",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            borderRadius: "20px",
            padding: "25px",
            boxShadow: "0 10px 30px rgba(255, 215, 0, 0.15)",
            color: "#fff",
            textAlign: "center"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>
              ✨ Tienda de Gemas Doradas
            </h3>
            <p style={{ fontSize: "13px", color: "#ccc", marginBottom: "20px" }}>
              Adquiere la exclusiva Gema Dorada con dinero real.
            </p>
            
            {isPurchasing ? (
              <div style={{ padding: "30px 0" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid rgba(255,215,0,0.1)",
                  borderTop: "4px solid #FFD700",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 15px auto"
                }} className="secure-spinner"></div>
                <p style={{ color: "#aaa" }}>Procesando pago seguro...</p>
              </div>
            ) : purchaseSuccess ? (
              <div style={{ padding: "20px 0" }}>
                <div style={{ fontSize: "50px", marginBottom: "15px" }}>🎉</div>
                <h4 style={{ color: "#00ff80", fontWeight: "bold", fontSize: "18px", marginBottom: "10px" }}>
                  ¡Compra Exitosa!
                </h4>
                <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>
                  Has recibido {purchasedAmount} Gemas Doradas.
                </p>
                <button
                  onClick={() => {
                    setPurchaseSuccess(false);
                    setShowPurchaseModal(false);
                  }}
                  style={{
                    background: "#ff0050",
                    border: "none",
                    borderRadius: "20px",
                    padding: "10px 25px",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                  {[
                    { amount: 10, priceMXN: "$19.00 MXN", priceUSD: "$0.99 USD" },
                    { amount: 50, priceMXN: "$79.00 MXN", priceUSD: "$3.99 USD", label: "Ahorra 20%" },
                    { amount: 100, priceMXN: "$139.00 MXN", priceUSD: "$6.99 USD", label: "Mejor Valor" }
                  ].map((option) => (
                    <div
                      key={option.amount}
                      onClick={() => handleBuyGems(option.amount)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 215, 0, 0.15)",
                        borderRadius: "12px",
                        padding: "12px 15px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                      className="purchase-option"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img src={coin6} alt="Gema Dorada" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: "bold", fontSize: "14px" }}>x{option.amount} Gemas</div>
                          {option.label && <span style={{ fontSize: "9px", color: "#FFD700", background: "rgba(255,215,0,0.08)", padding: "1px 5px", borderRadius: "6px", display: "inline-block", marginTop: "2px" }}>{option.label}</span>}
                        </div>
                      </div>
                      <div style={{ fontWeight: "bold", color: "#FFD700", textAlign: "right" }}>
                        <div>{option.priceMXN}</div>
                        <div style={{ fontSize: "11px", color: "#aaa", marginTop: "1px" }}>{option.priceUSD}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  style={{
                    background: "#333",
                    border: "none",
                    borderRadius: "20px",
                    padding: "8px 20px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Seguidores / Seguidos */}
      {showFollowModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }} onClick={() => setShowFollowModal(null)}>
          <div style={{
            width: "90%",
            maxWidth: "360px",
            background: "#18181c",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            color: "#fff"
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "15px", textAlign: "center" }}>
              {showFollowModal === "followers" ? "👥 Seguidores" : "👤 Seguidos"}
            </h3>

            {loadingFollowList ? (
              <div style={{ padding: "30px 0", textAlign: "center" }}>
                <div style={{
                  width: "30px",
                  height: "30px",
                  border: "3px solid rgba(255,255,255,0.1)",
                  borderTop: "3px solid #ff0050",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 10px auto"
                }} className="secure-spinner"></div>
                <p style={{ color: "#aaa", fontSize: "13px" }}>Cargando lista...</p>
              </div>
            ) : followUsersList.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666", padding: "20px 0", fontSize: "13px" }}>
                No hay usuarios para mostrar.
              </p>
            ) : (
              <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px", paddingRight: "5px" }}>
                {followUsersList.map((u) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <img
                      src={u.profilePic || "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"}
                      alt="avatar"
                      style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", objectFit: "cover" }}
                      onError={(e) => { e.target.src = "https://mybucketvideos.s3.us-east-2.amazonaws.com/assets/user1.png"; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: "bold", fontSize: "13px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.name || u.email?.split("@")[0] || "Usuario de Poptok"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#aaa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{u.email?.split("@")[0] || "poptok"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowFollowModal(null)}
              style={{
                background: "#ff0050",
                border: "none",
                borderRadius: "20px",
                padding: "8px 20px",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
                fontSize: "13px"
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      {/* MODAL: VERIFICACIÓN MODO EMPRESARIAL */}
      {showBusinessVerifyModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(10px)",
          zIndex: 10100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            background: "#121212",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "30px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            color: "white"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", background: "linear-gradient(90deg, #00f2fe, #ff0050)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Verificación de Empresa
              </h3>
              {businessVerifyStep !== 4 && (
                <button onClick={() => setShowBusinessVerifyModal(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>
                  <AiOutlineClose size={18} />
                </button>
              )}
            </div>

            {/* Steps indicator */}
            <div style={{ display: "flex", gap: "5px", marginBottom: "20px" }}>
              {[1, 2, 3].map((s) => (
                <div key={s} style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  background: businessVerifyStep >= s ? "linear-gradient(90deg, #00f2fe, #ff007f)" : "#333"
                }} />
              ))}
            </div>

            <form onSubmit={handleVerifySubmit}>
              {businessVerifyStep === 1 && (
                <div className="business-form">
                  <p style={{ fontSize: "13px", color: "#aaa", margin: "0 0 10px" }}>Paso 1: Información Legal de la Empresa</p>
                  <div className="business-form-group">
                    <label>Nombre Comercial de la Empresa *</label>
                    <input
                      type="text"
                      className="business-form-input"
                      value={verifyForm.companyName}
                      onChange={(e) => setVerifyForm({ ...verifyForm, companyName: e.target.value })}
                      placeholder="Ej. Acme Corp"
                      required
                    />
                  </div>
                  <div className="business-form-group">
                    <label>Registro Comercial / Tax ID / RFC *</label>
                    <input
                      type="text"
                      className="business-form-input"
                      value={verifyForm.taxId}
                      onChange={(e) => setVerifyForm({ ...verifyForm, taxId: e.target.value })}
                      placeholder="Ej. ACM123456XYZ"
                      required
                    />
                  </div>
                  <div className="business-form-group">
                    <label>Categoría Industrial *</label>
                    <select
                      className="business-form-select"
                      value={verifyForm.category}
                      onChange={(e) => setVerifyForm({ ...verifyForm, category: e.target.value })}
                    >
                      <option value="Tecnología & Software">Tecnología & Software</option>
                      <option value="Moda & Belleza">Moda & Belleza</option>
                      <option value="Alimentos & Bebidas">Alimentos & Bebidas</option>
                      <option value="Entretenimiento">Entretenimiento</option>
                      <option value="Salud & Deporte">Salud & Deporte</option>
                      <option value="Educación">Educación</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <button type="submit" className="business-submit-btn">Continuar</button>
                </div>
              )}

              {businessVerifyStep === 2 && (
                <div className="business-form">
                  <p style={{ fontSize: "13px", color: "#aaa", margin: "0 0 10px" }}>Paso 2: Información de Contacto</p>
                  <div className="business-form-group">
                    <label>Correo Electrónico de Contacto *</label>
                    <input
                      type="email"
                      className="business-form-input"
                      value={verifyForm.email}
                      onChange={(e) => setVerifyForm({ ...verifyForm, email: e.target.value })}
                      placeholder="contacto@miempresa.com"
                      required
                    />
                  </div>
                  <div className="business-form-group">
                    <label>Teléfono Comercial *</label>
                    <input
                      type="tel"
                      className="business-form-input"
                      value={verifyForm.phone}
                      onChange={(e) => setVerifyForm({ ...verifyForm, phone: e.target.value })}
                      placeholder="+52 55 1234 5678"
                      required
                    />
                  </div>
                  <div className="business-form-group">
                    <label>Sitio Web Comercial</label>
                    <input
                      type="url"
                      className="business-form-input"
                      value={verifyForm.website}
                      onChange={(e) => setVerifyForm({ ...verifyForm, website: e.target.value })}
                      placeholder="https://miempresa.com"
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button type="button" onClick={() => setBusinessVerifyStep(1)} className="business-submit-btn" style={{ background: "#444", flex: 1 }}>Atrás</button>
                    <button type="submit" className="business-submit-btn" style={{ flex: 1 }}>Continuar</button>
                  </div>
                </div>
              )}

              {businessVerifyStep === 3 && (
                <div className="business-form">
                  <p style={{ fontSize: "13px", color: "#aaa", margin: "0 0 10px" }}>Paso 3: Carga de Documentos Oficiales</p>
                  <p style={{ fontSize: "12px", color: "#888", margin: "0 0 10px" }}>
                    Sube un comprobante de registro comercial, licencia de negocio o constancia fiscal oficial para validar tu legitimidad.
                  </p>
                  <div 
                    onClick={() => setSelectedDocName("Constancia_Situacion_Fiscal_Acme.pdf")}
                    style={{
                      border: "2px dashed #444",
                      borderRadius: "15px",
                      padding: "30px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: selectedDocName ? "rgba(0, 242, 254, 0.05)" : "transparent",
                      borderColor: selectedDocName ? "#00f2fe" : "#444",
                      transition: "all 0.2s",
                      marginBottom: "15px"
                    }}
                  >
                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>📄</div>
                    <span style={{ fontSize: "13px", color: selectedDocName ? "#00f2fe" : "#ccc" }}>
                      {selectedDocName || "Haz clic para seleccionar o arrastra aquí tu documento PDF"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button type="button" onClick={() => setBusinessVerifyStep(2)} className="business-submit-btn" style={{ background: "#444", flex: 1 }}>Atrás</button>
                    <button type="submit" className="business-submit-btn" style={{ flex: 1 }}>Enviar Verificación</button>
                  </div>
                </div>
              )}

              {businessVerifyStep === 4 && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid rgba(255,255,255,0.1)",
                    borderTop: "4px solid #ff0050",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 20px auto"
                  }} className="secure-spinner"></div>
                  <h4 style={{ margin: "0 0 10px" }}>Validando Autenticidad</h4>
                  <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.5" }}>
                    Cruzando información del RFC y registros comerciales con bases de datos oficiales gubernamentales y de IA de Poptok...
                  </p>
                </div>
              )}

              {businessVerifyStep === 5 && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: "50px", marginBottom: "15px" }}>🏢🎉</div>
                  <h3 style={{ margin: "0 0 10px", color: "#2ecc71" }}>¡Verificado con éxito!</h3>
                  <p style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.6", marginBottom: "20px" }}>
                    Tu empresa ha sido dada de alta en Poptok. Se ha activado tu Dashboard de Anuncios y te hemos regalado **$100.00 USD** de saldo inicial para tus campañas.
                  </p>
                  <button type="button" onClick={() => setShowBusinessVerifyModal(false)} className="business-submit-btn" style={{ width: "100%", background: "linear-gradient(90deg, #00f2fe, #ff0050)" }}>
                    Comenzar en Modo Empresa
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DASHBOARD DE EMPRESA */}
      {showBusinessDashboard && (
        <div className="business-dashboard-modal">
          <div className="business-dashboard-card">
            <div className="business-dashboard-header">
              <h2>🏢 Dashboard de Empresa: {userProfile?.businessInfo?.businessName || "Mi Empresa"}</h2>
              <button 
                onClick={() => setShowBusinessDashboard(false)} 
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}
              >
                <AiOutlineClose size={20} />
              </button>
            </div>

            <div className="business-dashboard-tabs">
              <button 
                onClick={() => setDashboardTab("wallet")} 
                className={`business-dashboard-tab ${dashboardTab === "wallet" ? "active" : ""}`}
              >
                💳 Billetera Virtual
              </button>
              <button 
                onClick={() => setDashboardTab("campaigns")} 
                className={`business-dashboard-tab ${dashboardTab === "campaigns" ? "active" : ""}`}
              >
                📢 Gestor de Campañas
              </button>
              <button 
                onClick={() => setDashboardTab("branded")} 
                className={`business-dashboard-tab ${dashboardTab === "branded" ? "active" : ""}`}
              >
                🤝 Branded Content
              </button>
            </div>

            <div className="business-dashboard-content">
              {/* TAB 1: BILLETERA VIRTUAL */}
              {dashboardTab === "wallet" && (
                <div>
                  <div className="business-wallet-box">
                    <div className="business-wallet-info">
                      <h4>Crédito Disponible para Anuncios</h4>
                      <div className="business-wallet-balance">
                        ${(userProfile?.businessWallet || 0).toFixed(2)} USD
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setDepositSuccess(false);
                        setCreditCardNum("");
                        setCreditCardExpiry("");
                        setCreditCardCvc("");
                        setDepositAmountFixed(false);
                        setDepositModal(true);
                      }} 
                      className="business-wallet-btn"
                    >
                      + Recargar Crédito (Stripe/PayPal)
                    </button>
                  </div>

                  <h3>Tipos de Anuncios que puedes adquirir</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
                    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "15px", padding: "15px" }}>
                      <span style={{ fontSize: "20px" }}>📱</span>
                      <h4 style={{ margin: "10px 0 5px" }}>In-Feed Ads</h4>
                      <p style={{ fontSize: "12px", color: "#aaa", margin: 0, lineHeight: "1.4" }}>
                        Anuncios integrados orgánicamente en el feed de "Pa' Ti". Segmentados por interés. Costo: $0.05 USD por vista (CPV) / $0.15 USD por clic (CPC).
                      </p>
                    </div>
                    <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "15px", padding: "15px" }}>
                      <span style={{ fontSize: "20px" }}>🎬</span>
                      <h4 style={{ margin: "10px 0 5px" }}>Takeover / TopView</h4>
                      <p style={{ fontSize: "12px", color: "#aaa", margin: 0, lineHeight: "1.4" }}>
                        Anuncio a pantalla completa inmediatamente al abrir la app. Máxima visibilidad garantizada. Costo: $0.25 USD por vista / $0.50 USD por clic.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GESTOR DE CAMPAÑAS */}
              {dashboardTab === "campaigns" && (
                <div>
                  <h3>Crear Nueva Campaña Publicitaria</h3>
                  <form onSubmit={handleCreateCampaign} className="business-form" style={{ background: "#1a1a1a", padding: "15px", borderRadius: "15px", border: "1px solid #333", marginBottom: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="business-form-group">
                        <label>Título de la Campaña *</label>
                        <input
                          type="text"
                          className="business-form-input"
                          value={newCampaign.title}
                          onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                          placeholder="Ej. Consigue un 20% de Descuento"
                          required
                        />
                      </div>
                      <div className="business-form-group">
                        <label>Tipo de Anuncio *</label>
                        <select
                          className="business-form-select"
                          value={newCampaign.adType}
                          onChange={(e) => setNewCampaign({ ...newCampaign, adType: e.target.value })}
                        >
                          <option value="infeed">In-Feed Ad (Post en Feed)</option>
                          <option value="takeover">Takeover / TopView (Inicio Pantalla Completa)</option>
                        </select>
                      </div>
                    </div>

                    <div className="business-form-group">
                      <label>Descripción de Anuncio</label>
                      <textarea
                        rows={2}
                        className="business-form-textarea"
                        value={newCampaign.description}
                        onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                        placeholder="Escribe el texto de tu anuncio..."
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="business-form-group">
                        <label>Enlace del Botón Acción (CTA Link) *</label>
                        <input
                          type="url"
                          className="business-form-input"
                          value={newCampaign.link}
                          onChange={(e) => setNewCampaign({ ...newCampaign, link: e.target.value })}
                          placeholder="https://mitienda.com/oferta"
                          required
                        />
                      </div>
                      <div className="business-form-group">
                        <label>Imagen del Anuncio (URL) *</label>
                        <input
                          type="url"
                          className="business-form-input"
                          value={newCampaign.imageUrl}
                          onChange={(e) => setNewCampaign({ ...newCampaign, imageUrl: e.target.value })}
                          placeholder="URL de imagen premium..."
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="business-form-group">
                        <label>Interés de Segmentación *</label>
                        <select
                          className="business-form-select"
                          value={newCampaign.tags}
                          onChange={(e) => setNewCampaign({ ...newCampaign, tags: e.target.value })}
                        >
                          <option value="Tecnología & Software">Tecnología & Software</option>
                          <option value="Moda & Belleza">Moda & Belleza</option>
                          <option value="Alimentos & Bebidas">Alimentos & Bebidas</option>
                          <option value="Entretenimiento">Entretenimiento</option>
                          <option value="Salud & Deporte">Salud & Deporte</option>
                          <option value="Educación">Educación</option>
                          <option value="Random">Todos</option>
                        </select>
                      </div>
                      <div className="business-form-group">
                        <label>Presupuesto Asignado (USD) *</label>
                        <input
                          type="number"
                          className="business-form-input"
                          value={newCampaign.budget}
                          onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                          placeholder="Ej. 100"
                          min="10"
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="business-submit-btn" style={{ background: "linear-gradient(90deg, #00f2fe, #ff0050)" }}>
                      Publicar Campaña
                    </button>
                  </form>

                  <h3>Tus Campañas Activas</h3>
                  <div className="business-table-container">
                    <table className="business-table">
                      <thead>
                        <tr>
                          <th>Campaña</th>
                          <th>Tipo</th>
                          <th>Presupuesto</th>
                          <th>Etiqueta</th>
                          <th>Vistas</th>
                          <th>Clics</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignsList.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: "center", color: "#666", padding: "15px" }}>
                              No tienes campañas creadas.
                            </td>
                          </tr>
                        ) : (
                          campaignsList.map((c) => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: "bold" }}>{c.title}</td>
                              <td style={{ textTransform: "capitalize" }}>{c.adType}</td>
                              <td>${c.remainingBudget?.toFixed(2)} / ${c.budget?.toFixed(2)}</td>
                              <td>{c.tags}</td>
                              <td>{c.viewsCount || 0}</td>
                              <td>{c.clicksCount || 0}</td>
                              <td>
                                <span className={`business-status-badge ${c.status === "active" ? "active" : "inactive"}`}>
                                  {c.status === "active" ? "Activo" : "Finalizado"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: BRANDED CONTENT */}
              {dashboardTab === "branded" && (
                <div>
                  <h3>Garantía de Contenido Patrocinado (Escrow)</h3>
                  <p style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.4", margin: "0 0 15px" }}>
                    Permite que las marcas paguen a creadores de contenido dentro de Poptok actuando como intermediario seguro. 
                    El presupuesto ingresado será retenido de tu saldo y enviado al creador. El cobro final se efectúa cuando el creador publique tu video patrocinado.
                  </p>

                  <form onSubmit={handleSendBrandedOffer} className="business-form" style={{ background: "#1a1a1a", padding: "15px", borderRadius: "15px", border: "1px solid #333" }}>
                    <div className="business-form-group">
                      <label>Seleccionar Creador Poptok *</label>
                      <select
                        className="business-form-select"
                        value={brandedOffer.creatorId}
                        onChange={(e) => setBrandedOffer({ ...brandedOffer, creatorId: e.target.value })}
                        required
                      >
                        <option value="">Selecciona un creador...</option>
                        {allCreatorsList.map((creator) => (
                          <option key={creator.id} value={creator.id}>
                            @{creator.name || creator.email?.split("@")[0]} ({creator.followers?.length || 0} seguidores)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="business-form-group">
                      <label>Presupuesto de Patrocinio (USD) *</label>
                      <input
                        type="number"
                        className="business-form-input"
                        value={brandedOffer.amount}
                        onChange={(e) => setBrandedOffer({ ...brandedOffer, amount: e.target.value })}
                        placeholder="Monto a pagar, ej. 500"
                        min="50"
                        required
                      />
                    </div>

                    <div className="business-form-group">
                      <label>Instrucciones de la Campaña (Branded Content Brief) *</label>
                      <textarea
                        rows={3}
                        className="business-form-textarea"
                        value={brandedOffer.description}
                        onChange={(e) => setBrandedOffer({ ...brandedOffer, description: e.target.value })}
                        placeholder="Describe los detalles de lo que necesitas en el video patrocinado..."
                        required
                      />
                    </div>

                    <button type="submit" className="business-submit-btn" style={{ background: "linear-gradient(90deg, #00f2fe, #ff0050)" }}>
                      Enviar Propuesta y Retener Fondos
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: RECARGAR SALDO CON STRIPE / PAYPAL */}
      {depositModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(5px)",
          zIndex: 10200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            background: "#16161a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "20px",
            padding: "25px",
            maxWidth: "380px",
            width: "100%",
            boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
            color: "white"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Depósito Stripe / PayPal</h3>
              {!isDepositing && (
                <button onClick={() => setDepositModal(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>
                  <AiOutlineClose size={18} />
                </button>
              )}
            </div>

            {depositSuccess ? (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>💳✅</div>
                <h4 style={{ color: "#2ecc71", margin: "0 0 10px" }}>¡Depósito Completado!</h4>
                <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "15px" }}>
                  Se han abonado **${parseFloat(depositAmount).toFixed(2)} USD** a tu billetera virtual de anunciante.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button 
                    onClick={() => {
                      setDepositModal(false);
                    }} 
                    className="business-submit-btn" 
                    style={{ margin: 0, background: "#444" }}
                  >
                    Cerrar
                  </button>
                  <button 
                    onClick={() => {
                      setDepositModal(false);
                      // Trigger receipt/invoice modal
                    }} 
                    className="business-submit-btn" 
                    style={{ margin: 0, background: "linear-gradient(90deg, #00f2fe, #ff0050)" }}
                  >
                    Ver Factura B2B
                  </button>
                </div>
              </div>
            ) : (
              <div className="business-form">
                <div className="business-form-group">
                  <label>Monto a Depositar (USD) *</label>
                  <input
                    type="number"
                    className="business-form-input"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Ej. 100"
                    min="10"
                    disabled={depositAmountFixed}
                  />
                  {!depositAmountFixed && (
                    <button 
                      onClick={() => setDepositAmountFixed(true)}
                      disabled={!depositAmount || parseFloat(depositAmount) < 10}
                      className="business-submit-btn"
                      style={{ marginTop: "15px", background: "linear-gradient(90deg, #00f2fe, #ff0050)" }}
                    >
                      Confirmar Monto
                    </button>
                  )}
                </div>

                {depositAmountFixed && (
                  <Elements stripe={stripePromise}>
                    <StripeDepositForm
                      amount={depositAmount}
                      onCancel={() => setDepositAmountFixed(false)}
                      onSuccess={(payIntentId) => {
                        const invId = "INV-" + Math.floor(Math.random() * 900000 + 100000);
                        setInvoiceData({
                          id: invId,
                          companyName: userProfile?.businessInfo?.businessName || verifyForm.companyName || "Empresa Poptok",
                          taxId: userProfile?.businessInfo?.taxId || verifyForm.taxId || "XAXX010101000",
                          amount: parseFloat(depositAmount),
                          date: new Date().toLocaleDateString(),
                          time: new Date().toLocaleTimeString(),
                          method: "Stripe Real Card (" + payIntentId.substring(0, 15) + ")",
                          authCode: "AUTH-" + Math.floor(Math.random() * 1000000)
                        });
                        setDepositSuccess(true);
                      }}
                      businessName={userProfile?.businessInfo?.businessName || verifyForm.companyName || "Empresa Poptok"}
                      taxId={userProfile?.businessInfo?.taxId || verifyForm.taxId || "XAXX010101000"}
                      user={user}
                      fetchUserData={fetchUserData}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: FACTURA B2B (FACTURACIÓN AUTOMÁTICA) */}
      {invoiceData && (
        <div className="b2b-invoice-modal-overlay" onClick={() => setInvoiceData(null)}>
          <div className="b2b-invoice-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", borderBottom: "2px dashed #000", paddingBottom: "15px", marginBottom: "15px" }}>
              <h2 style={{ margin: "0 0 5px", fontSize: "20px", fontWeight: "900", textTransform: "uppercase" }}>POPTOK APP B2B</h2>
              <p style={{ fontSize: "11px", margin: 0, color: "#444" }}>Facturación Electrónica B2B Automática</p>
              <p style={{ fontSize: "11px", margin: "2px 0 0", color: "#444" }}>Conforme a normativas internacionales de publicidad</p>
            </div>

            <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px", lineHeight: "1.4" }}>
              <div><strong>Factura N°:</strong> {invoiceData.id}</div>
              <div><strong>Fecha:</strong> {invoiceData.date} - {invoiceData.time}</div>
              <div><strong>Cliente:</strong> {invoiceData.companyName}</div>
              <div><strong>RFC/Tax ID:</strong> {invoiceData.taxId}</div>
              <div><strong>Método:</strong> {invoiceData.method}</div>
              <div><strong>Autorización:</strong> {invoiceData.authCode}</div>
              <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "bold" }}>
                <span>Subtotal (Crédito Publicidad):</span>
                <span>${invoiceData.amount.toFixed(2)} USD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>IVA/Impuestos (0%):</span>
                <span>$0.00 USD</span>
              </div>
              <div style={{ borderBottom: "2px dashed #000", margin: "10px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "900" }}>
                <span>TOTAL PAGADO:</span>
                <span>${invoiceData.amount.toFixed(2)} USD</span>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                onClick={() => {
                  window.print();
                }} 
                style={{ background: "#000", color: "white", border: "none", borderRadius: "5px", padding: "8px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
              >
                🖨️ Imprimir / Descargar PDF
              </button>
              <button 
                onClick={() => setInvoiceData(null)} 
                style={{ background: "#eee", color: "#000", border: "1px solid #ccc", borderRadius: "5px", padding: "8px 12px", cursor: "pointer", fontSize: "12px" }}
              >
                Cerrar Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
