import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase.js";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { FiPlus, FiX, FiSearch, FiShoppingBag, FiTag } from "react-icons/fi";
import coin6 from "../assets/coin_6.svg";
import "../index.css";

const Shop = ({ onContactSeller, userStatus, initialSellerIdFilter, onClearSellerFilter }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Sell item states
  const [showSellModal, setShowSellModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBuyingProduct, setIsBuyingProduct] = useState(false);

  const fileInputRef = useRef(null);
  const currentUser = auth.currentUser;

  const handleSimulatedPurchase = async () => {
    if (!currentUser || !selectedProduct) return;
    setIsBuyingProduct(true);
    try {
      // Simular retraso de procesamiento de Stripe / PayPal
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Crear documento en la colección activity_notifications
      await addDoc(collection(db, "activity_notifications"), {
        userId: selectedProduct.sellerId,
        type: "purchase",
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || "Comprador de Poptok",
        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        price: selectedProduct.price,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      alert("🛒 ¡Compra realizada con éxito! El vendedor ha sido notificado.");
      setSelectedProduct(null);
    } catch (err) {
      console.error("Error al procesar la compra:", err);
      alert("Error al procesar la compra.");
    } finally {
      setIsBuyingProduct(false);
    }
  };

  // ─── Fetch products ────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching products:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ─── Sell Item Form Handlers ───────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleSellSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Inicia sesión para vender un artículo.");
      return;
    }
    if (userStatus === "restricted") {
      alert("Acceso denegado: Tu cuenta tiene restricciones y no puedes publicar artículos.");
      return;
    }
    if (!title.trim() || !description.trim() || !price || !sellerPhone.trim() || !imageFile) {
      alert("Por favor completa todos los campos y selecciona una imagen.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `products/${uuidv4()}.${ext}`;
      const ref = storageRef(storage, path);

      const uploadTask = uploadBytesResumable(ref, imageFile);

      uploadTask.on("state_changed",
        (snap) => {
          setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        },
        (err) => {
          console.error("Upload error:", err);
          alert("Error al subir la imagen: " + err.message);
          setUploading(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(ref);
          await addDoc(collection(db, "products"), {
            title: title.trim(),
            description: description.trim(),
            price: parseInt(price, 10) || 0,
            imageUrl: downloadUrl,
            sellerId: currentUser.uid,
            sellerName: currentUser.displayName || currentUser.email || "Vendedor Anónimo",
            sellerPhone: sellerPhone.trim(),
            createdAt: new Date().toISOString(),
          });

          // Reset form
          setTitle("");
          setDescription("");
          setPrice("");
          setSellerPhone("");
          setImageFile(null);
          setImagePreviewUrl(null);
          setUploading(false);
          setShowSellModal(false);
          alert("🎉 ¡Tu artículo ha sido publicado con éxito!");
        }
      );
    } catch (err) {
      console.error("Error publishing product:", err);
      alert("Error al publicar el artículo.");
      setUploading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (initialSellerIdFilter && p.sellerId !== initialSellerIdFilter) {
      return false;
    }
    return (
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="shop-container">
      {/* ─── Shop Header ────────────────────────────────────────────────────── */}
      <div className="shop-header-bar">
        <div className="shop-brand">
          <FiShoppingBag size={24} style={{ color: "#FF0050" }} />
          <h2>Tienda Poptok</h2>
        </div>
        
        <div className="shop-search-wrapper">
          <FiSearch className="shop-search-icon" />
          <input
            type="text"
            placeholder="Buscar artículos..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {currentUser && (
          <button className="shop-sell-btn" onClick={() => {
            if (userStatus === "restricted") {
              alert("Acceso denegado: Tu cuenta tiene restricciones y no puedes publicar artículos.");
              return;
            }
            setShowSellModal(true);
          }}>
            <FiPlus size={16} /> Vender un artículo
          </button>
        )}
      </div>

      {initialSellerIdFilter && (
        <div className="shop-filter-banner" style={{
          background: "rgba(255, 0, 80, 0.08)",
          border: "1px solid rgba(255, 0, 80, 0.2)",
          borderRadius: "15px",
          padding: "12px 18px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          boxSizing: "border-box",
          gap: "10px",
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🛍️</span>
            <div>
              <p style={{ margin: 0, fontWeight: "bold", color: "#fff", fontSize: "14px" }}>
                Artículos en venta de: @{filteredProducts.length > 0 ? filteredProducts[0].sellerName.split("@")[0] : "este usuario"}
              </p>
              <p style={{ margin: 0, color: "#aaa", fontSize: "12px" }}>
                Mostrando {filteredProducts.length} {filteredProducts.length === 1 ? "artículo" : "artículos"}
              </p>
            </div>
          </div>
          <button
            onClick={onClearSellerFilter}
            style={{
              background: "#FF0050",
              color: "#fff",
              border: "none",
              borderRadius: "20px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              marginLeft: "auto",
              boxShadow: "0 2px 8px rgba(255, 0, 80, 0.3)"
            }}
          >
            Ver toda la tienda
          </button>
        </div>
      )}

      {/* ─── Products Grid ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="shop-loading">
          <p>Cargando artículos en venta...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="shop-empty">
          <p>🛍️ No hay artículos en venta en este momento.</p>
          {initialSellerIdFilter ? (
            <button className="shop-sell-btn-large" onClick={onClearSellerFilter} style={{ marginTop: "15px" }}>
              Ver toda la tienda
            </button>
          ) : (
            currentUser && (
              <button className="shop-sell-btn-large" onClick={() => setShowSellModal(true)}>
                ¡Publica tu primer artículo hoy!
              </button>
            )
          )}
        </div>
      ) : (
        <div className="shop-grid">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="shop-card"
              onClick={() => setSelectedProduct(prod)}
            >
              <div className="shop-card-image-wrapper">
                <img src={prod.imageUrl} alt={prod.title} className="shop-card-image" />
                <span className="shop-card-price">
                  ${prod.price}
                </span>
              </div>
              <div className="shop-card-info">
                <h3>{prod.title}</h3>
                <p className="shop-card-desc">{prod.description}</p>
                <div className="shop-card-seller">
                  <span>Por: @{prod.sellerName.split("@")[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Product Details Modal ──────────────────────────────────────────── */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal-card" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setSelectedProduct(null)}>
              <FiX size={20} />
            </button>

            <div className="product-modal-body">
              <div className="product-modal-left">
                <img src={selectedProduct.imageUrl} alt={selectedProduct.title} />
              </div>
              <div className="product-modal-right">
                <div className="product-modal-badge">
                  <FiTag size={12} /> En Venta
                </div>
                <h2>{selectedProduct.title}</h2>
                <div className="product-modal-price">
                  <span>${selectedProduct.price}</span>
                </div>
                <div className="product-modal-desc">
                  <h4>Descripción</h4>
                  <p>{selectedProduct.description}</p>
                </div>
                <div className="product-modal-seller">
                  <h4>Vendedor</h4>
                  <p>@{selectedProduct.sellerName}</p>
                </div>

                {currentUser && currentUser.uid !== selectedProduct.sellerId ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                    <button
                      onClick={handleSimulatedPurchase}
                      className="product-modal-contact-btn"
                      style={{
                        background: "linear-gradient(90deg, #00f2fe, #ff0050)",
                        color: "white",
                        fontWeight: "bold",
                        border: "none",
                        boxShadow: "0 4px 15px rgba(255, 0, 80, 0.4)",
                        padding: "12px",
                        borderRadius: "25px",
                        cursor: "pointer"
                      }}
                      disabled={isBuyingProduct}
                    >
                      {isBuyingProduct ? "Procesando Compra..." : "🛍️ Comprar Artículo"}
                    </button>

                    {selectedProduct.sellerPhone ? (
                      <a
                        href={`https://wa.me/${selectedProduct.sellerPhone.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "")}?text=${encodeURIComponent(
                          `Hola, estoy interesado en tu artículo "${selectedProduct.title}" en Poptok.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-modal-contact-btn whatsapp-btn"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          background: "#25D366",
                          color: "white",
                          textDecoration: "none",
                          fontWeight: "bold",
                          padding: "12px",
                          borderRadius: "25px",
                          boxShadow: "0 4px 15px rgba(37, 211, 102, 0.3)"
                        }}
                      >
                        💬 Contactar Vendedor (WhatsApp)
                      </a>
                    ) : (
                      <button
                        className="product-modal-contact-btn"
                        onClick={() => {
                          onContactSeller(selectedProduct.sellerId);
                          setSelectedProduct(null);
                        }}
                      >
                        💬 Contactar al Vendedor
                      </button>
                    )}
                  </div>
                ) : currentUser && currentUser.uid === selectedProduct.sellerId ? (
                  <p className="product-modal-own-item">Tú eres el vendedor de este artículo</p>
                ) : (
                  <p className="product-modal-own-item">Inicia sesión para contactar al vendedor</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sell Item Modal ────────────────────────────────────────────────── */}
      {showSellModal && (
        <div className="product-modal-overlay" onClick={() => { if (!uploading) setShowSellModal(false); }}>
          <div className="product-modal-card sell-modal" onClick={e => e.stopPropagation()}>
            <div className="product-modal-header">
              <h2>Vender un Artículo</h2>
              <button className="product-modal-close" onClick={() => { if (!uploading) setShowSellModal(false); }}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSellSubmit} className="sell-form">
              <div className="sell-form-columns">
                <div className="sell-form-left">
                  <div
                    className="sell-image-upload"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Preview" className="sell-image-preview" />
                    ) : (
                      <div className="sell-image-placeholder">
                        <span>📸 Seleccionar Foto</span>
                        <p>JPG, PNG - máx. 5MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={uploading}
                    />
                  </div>
                </div>

                <div className="sell-form-right">
                  <label>Título del artículo</label>
                  <input
                    type="text"
                    placeholder="Ej. Cámara Vintage, Audífonos..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={40}
                    disabled={uploading}
                    required
                  />

                  <label>Descripción detallada</label>
                  <textarea
                    placeholder="Detalles sobre el estado, características..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={300}
                    rows={4}
                    disabled={uploading}
                    required
                  />

                  <label>Precio ($)</label>
                  <div className="sell-price-input-wrapper">
                    <span className="sell-price-currency-symbol" style={{ color: "#aaa", fontSize: "16px", marginRight: "6px" }}>$</span>
                    <input
                      type="number"
                      placeholder="100"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      min="1"
                      disabled={uploading}
                      required
                      style={{ paddingLeft: "5px" }}
                    />
                  </div>

                  <label>Teléfono Celular (WhatsApp)</label>
                  <input
                    type="tel"
                    placeholder="Ej. +5215512345678"
                    value={sellerPhone}
                    onChange={e => setSellerPhone(e.target.value)}
                    disabled={uploading}
                    required
                  />
                </div>
              </div>

              {uploading && (
                <div className="sell-progress-wrapper">
                  <div className="sell-progress-bar" style={{ width: `${progress}%` }} />
                  <span>Subiendo foto... {progress}%</span>
                </div>
              )}

              <div className="sell-form-actions">
                <button
                  type="button"
                  className="sell-cancel-btn"
                  onClick={() => setShowSellModal(false)}
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="sell-submit-btn"
                  disabled={uploading}
                >
                  {uploading ? "Publicando..." : "Publicar Artículo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
