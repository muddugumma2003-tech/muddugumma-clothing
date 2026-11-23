import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import {
  Heart, ShoppingBag, Search, Menu, X, User, LogOut, Home,
  Package, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus,
  Trash2, Phone, Mail, MapPin, ArrowLeft, CheckCircle, AlertCircle
} from "lucide-react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

const readLocal = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export default function CustomerStore() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState("welcome");
  const [authMode, setAuthMode] = useState("login");
  const [authMethod, setAuthMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(""); // Indian 10-digit mobile number; +91 is added when sending OTP.
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [fullName, setFullName] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [cart, setCart] = useState(() => readLocal("muddugumma_cart", []));
  const [wishlist, setWishlist] = useState(() => readLocal("muddugumma_wishlist", []));
  const [activeTab, setActiveTab] = useState("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (nextSession) setScreen("shop");
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("muddugumma_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("muddugumma_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    loadStore();

    // Refresh customer-facing branding when a customer returns to this tab.
    const refreshStoreSettings = async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error) setSettings(data || null);
    };

    window.addEventListener("focus", refreshStoreSettings);
    return () => window.removeEventListener("focus", refreshStoreSettings);
  }, []);

  async function loadStore() {
    setLoading(true);
    const [p, c, v, s] = await Promise.all([
      supabase.from("products").select("*").eq("is_active", true).eq("is_available", true).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("product_variants").select("*").eq("is_available", true),
      supabase.from("store_settings").select("*").limit(1).maybeSingle()
    ]);
    if (p.error) console.error("Products:", p.error.message);
    if (c.error) console.error("Categories:", c.error.message);
    if (v.error) console.error("Variants:", v.error.message);
    if (s.error) console.error("Store settings:", s.error.message);
    setProducts(p.data || []);
    setCategories(c.data || []);
    setVariants(v.data || []);
    setSettings(s.data || null);
    setLoading(false);
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (error) throw error;
        setAuthMessage("Account created. If email confirmation is enabled, open the confirmation link sent to your inbox before logging in. Check Spam/Junk too.");
        setAuthMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
      }
    } catch (error) {
      const message = error.message || "";
      if (message.toLowerCase().includes("email not confirmed")) {
        setAuthError("Please open the confirmation link sent to your email, then return here and log in. Check Spam/Junk too.");
      } else if (message.toLowerCase().includes("invalid login credentials")) {
        setAuthError("Email or password is incorrect. Check both details, or create an account first.");
      } else {
        setAuthError(message || "Unable to continue. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(e) {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setBusy(true);
    try {
      const digits = phone.replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(digits)) {
        throw new Error("Enter a valid 10-digit Indian mobile number.");
      }
      const indianPhone = `+91${digits}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: indianPhone });
      if (error) throw error;
      setPhone(digits);
      setOtpSent(true);
      setAuthMessage("OTP sent. Enter the verification code received on your phone.");
    } catch (error) {
      const message = error.message || "";
      if (message.toLowerCase().includes("unsupported phone provider")) {
        setAuthError("Mobile OTP is not activated yet. The store administrator must configure an SMS provider in Supabase before customers can receive OTPs.");
      } else {
        setAuthError(message || "Could not send OTP. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setBusy(true);
    try {
      const digits = phone.replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(digits)) {
        throw new Error("Enter a valid 10-digit Indian mobile number.");
      }
      if (!/^\d{4,8}$/.test(otp.trim())) {
        throw new Error("Enter the OTP sent to your mobile.");
      }
      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${digits}`,
        token: otp.trim(),
        type: "sms"
      });
      if (error) throw error;
    } catch (error) {
      setAuthError(error.message || "OTP verification failed. Please request a new OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setScreen("welcome");
    setActiveTab("home");
  }

  function enterAsGuest() {
    setScreen("shop");
    setActiveTab("home");
  }

  const parentCategories = categories.filter((c) => !c.parent_id);
  const visibleProducts = useMemo(() => products.filter((p) => {
    const matchesSearch = `${p.name || ""} ${p.description || ""} ${p.sku || ""}`.toLowerCase().includes(search.toLowerCase());
    if (categoryId === "all") return matchesSearch;
    const childIds = categories.filter((c) => c.parent_id === categoryId).map((c) => c.id);
    return matchesSearch && (p.category_id === categoryId || childIds.includes(p.category_id));
  }), [products, categories, search, categoryId]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  function toggleWishlist(productId) {
    setWishlist((old) => old.includes(productId) ? old.filter((id) => id !== productId) : [...old, productId]);
  }

  function openProduct(product) {
    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor("");
    setSelectedImage(0);
    setActiveTab("product");
  }

  function productVariants(product) {
    return variants.filter((v) => v.product_id === product.id);
  }

  function productSizes(product) {
    const fromVariants = productVariants(product).map((v) => v.size).filter(Boolean);
    return [...new Set([...(product.sizes || []), ...fromVariants])];
  }

  function productColors(product) {
    const fromVariants = productVariants(product).map((v) => v.color).filter(Boolean);
    return [...new Set([...(product.colors || []), ...fromVariants])];
  }

  function addToCart(product) {
    const sizes = productSizes(product);
    const colors = productColors(product);
    if (sizes.length && !selectedSize) {
      setNotice("Please select a size first.");
      return;
    }
    if (colors.length && !selectedColor) {
      setNotice("Please select a colour first.");
      return;
    }
    const variant = productVariants(product).find((v) =>
      (!v.size || v.size === selectedSize) && (!v.color || v.color === selectedColor)
    );
    if (variant && variant.is_available === false) {
      setNotice("This option is currently unavailable.");
      return;
    }
    const price = Number(variant?.price_override ?? product.price ?? 0);
    const key = `${product.id}_${variant?.id || selectedSize}_${selectedColor}`;
    setCart((old) => {
      const found = old.find((item) => item.key === key);
      if (found) return old.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
      return [...old, {
        key, productId: product.id, variantId: variant?.id || null,
        name: product.name, image: (product.image_urls || [])[0] || product.image_url || "",
        size: selectedSize, color: selectedColor, price, quantity: 1
      }];
    });
    setNotice("Added to your cart.");
    setActiveTab("cart");
    setSelectedProduct(null);
  }

  function changeQuantity(key, amount) {
    setCart((old) => old.map((item) => item.key === key ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  }

  function removeCartItem(key) {
    setCart((old) => old.filter((item) => item.key !== key));
  }

  const brandTitle = settings?.welcome_title || "Welcome to Muddugumma";
  const brandLine = settings?.brand_line || "Muddugumma by Lakshmi";
  const imagesFor = (product) => {
    const list = Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [];
    if (product.image_url && !list.includes(product.image_url)) list.unshift(product.image_url);
    return list;
  };

  if (authLoading || loading) {
    return <div style={styles.center}><div style={styles.spinner} /><p>Loading Muddugumma...</p></div>;
  }

  if (screen === "welcome" && !session) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <Brand settings={settings} title={brandTitle} line={brandLine} />
          <h2 style={styles.heading}>Welcome</h2>
          <p style={styles.muted}>Sign in or create an account to shop with us.</p>
          <div style={styles.tabs}>
            <button style={authMode === "login" ? styles.tabActive : styles.tab} onClick={() => setAuthMode("login")}>Login</button>
            <button style={authMode === "signup" ? styles.tabActive : styles.tab} onClick={() => setAuthMode("signup")}>Create account</button>
          </div>
          <div style={styles.tabs}>
            <button style={authMethod === "email" ? styles.tabActive : styles.tab} onClick={() => { setAuthMethod("email"); setAuthError(""); }}>Email & password</button>
            <button style={authMethod === "phone" ? styles.tabActive : styles.tab} onClick={() => { setAuthMethod("phone"); setAuthError(""); }}>Mobile OTP</button>
          </div>
          {authMethod === "email" ? (
            <form onSubmit={handleEmailAuth} style={styles.form}>
              {authMode === "signup" && <input style={styles.input} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />}
              <input style={styles.input} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input style={styles.input} type="password" placeholder="Password (minimum 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              <button style={styles.primaryButton} disabled={busy}>{busy ? "Please wait..." : authMode === "signup" ? "Create account" : "Login"}</button>
            </form>
          ) : (
            <form onSubmit={otpSent ? verifyOtp : sendOtp} style={styles.form}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...styles.input, width: "auto", minWidth: 58, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, background: "#f8f0f3" }}>+91</span>
                <input
                  style={{ ...styles.input, flex: 1, minWidth: 0 }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                />
              </div>
              <p style={styles.smallMuted}>India only. +91 is added automatically.</p>
              {otpSent && <input style={styles.input} inputMode="numeric" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />}
              <button style={styles.primaryButton} disabled={busy}>{busy ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}</button>
              {otpSent && <button type="button" style={styles.textButton} onClick={() => { setOtpSent(false); setOtp(""); }}>Change phone number</button>}
            </form>
          )}
          {authMessage && <p style={styles.success}><CheckCircle size={16} /> {authMessage}</p>}
          {authError && <p style={styles.error}><AlertCircle size={16} /> {authError}</p>}
          <div style={styles.orLine}><span>OR</span></div>
          <button style={styles.secondaryButton} onClick={enterAsGuest}>Continue as guest — browse only</button>
          <p style={styles.smallMuted}>Guests can browse, save wishlist items and use the cart. Login is required to place an order.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <button style={styles.iconButton} onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu"><Menu /></button>
        <button style={styles.brandButton} onClick={() => { setActiveTab("home"); setSelectedProduct(null); }}>
          {settings?.logo_url ? <img src={settings.logo_url} alt="Muddugumma logo" style={styles.logo} /> : <span style={styles.logoFallback}>M</span>}
          <span><strong>{brandTitle}</strong><small>{brandLine}</small></span>
        </button>
        <div style={styles.headerActions}>
          <button style={styles.iconButton} onClick={() => setActiveTab("wishlist")} aria-label="Wishlist"><Heart />{wishlist.length > 0 && <i style={styles.count}>{wishlist.length}</i>}</button>
          <button style={styles.iconButton} onClick={() => setActiveTab("cart")} aria-label="Cart"><ShoppingBag />{cartCount > 0 && <i style={styles.count}>{cartCount}</i>}</button>
          {session ? <button style={styles.iconButton} onClick={logout} aria-label="Logout"><LogOut /></button> : <button style={styles.iconButton} onClick={() => setScreen("welcome")} aria-label="Login"><User /></button>}
        </div>
      </header>

      {(mobileMenu || true) && <nav style={{ ...styles.nav, ...(mobileMenu ? styles.navOpen : {}) }}>
        <button style={activeTab === "home" ? styles.navActive : styles.navButton} onClick={() => { setActiveTab("home"); setSelectedProduct(null); setMobileMenu(false); }}><Home size={17}/> Home</button>
        <button style={activeTab === "products" ? styles.navActive : styles.navButton} onClick={() => { setActiveTab("products"); setSelectedProduct(null); setMobileMenu(false); }}>Products</button>
        <button style={activeTab === "wishlist" ? styles.navActive : styles.navButton} onClick={() => { setActiveTab("wishlist"); setMobileMenu(false); }}><Heart size={17}/> Wishlist</button>
        <button style={activeTab === "cart" ? styles.navActive : styles.navButton} onClick={() => { setActiveTab("cart"); setMobileMenu(false); }}><ShoppingBag size={17}/> Cart ({cartCount})</button>
        <button style={activeTab === "orders" ? styles.navActive : styles.navButton} onClick={() => { if (!session) { setScreen("welcome"); return; } setActiveTab("orders"); setMobileMenu(false); }}><Package size={17}/> Orders</button>
      </nav>}

      {notice && <div style={styles.notice} onClick={() => setNotice("")}>{notice} <X size={15}/></div>}

      <main style={styles.main}>
        {activeTab === "home" && <>
          {settings?.banner_urls?.length > 0 && <div style={styles.bannerRow}>{settings.banner_urls.map((url, i) => <img key={i} src={url} alt={`Store banner ${i + 1}`} style={styles.banner} />)}</div>}
          <section style={styles.hero}>
            <div><p style={styles.eyebrow}>WELCOME TO</p><h1>{brandTitle}</h1><p>{settings?.feedback_text || "Discover styles made with love."}</p><button style={styles.primaryButton} onClick={() => setActiveTab("products")}>Explore collection</button></div>
          </section>
          <h2 style={styles.sectionTitle}>Shop by category</h2>
          <div style={styles.categoryGrid}>
            <button style={styles.categoryCard} onClick={() => { setCategoryId("all"); setActiveTab("products"); }}>All products</button>
            {parentCategories.map((cat) => <button key={cat.id} style={styles.categoryCard} onClick={() => { setCategoryId(cat.id); setActiveTab("products"); }}>
              {cat.image_url && <img src={cat.image_url} alt="" style={styles.categoryImage}/>}<span>{cat.name}</span>
              {categories.filter((child) => child.parent_id === cat.id).map((child) => <small key={child.id}>{child.name}</small>)}
            </button>)}
          </div>
          <h2 style={styles.sectionTitle}>Latest collection</h2>
          <ProductGrid products={products.slice(0, 8)} wishlist={wishlist} toggleWishlist={toggleWishlist} openProduct={openProduct} />
        </>}

        {(activeTab === "products" || activeTab === "wishlist") && <>
          <div style={styles.listHeader}><div><h1>{activeTab === "wishlist" ? "My Wishlist" : "Our Products"}</h1><p style={styles.muted}>{activeTab === "wishlist" ? "Your saved favourites" : "Find something you love"}</p></div>
            <div style={styles.searchBox}><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." /></div>
          </div>
          {activeTab === "products" && <div style={styles.categoryChips}><button style={categoryId === "all" ? styles.chipActive : styles.chip} onClick={() => setCategoryId("all")}>All</button>{parentCategories.map((c) => <button key={c.id} style={categoryId === c.id ? styles.chipActive : styles.chip} onClick={() => setCategoryId(c.id)}>{c.name}</button>)}</div>}
          <ProductGrid products={(activeTab === "wishlist" ? wishlistProducts : visibleProducts)} wishlist={wishlist} toggleWishlist={toggleWishlist} openProduct={openProduct}/>
          {((activeTab === "wishlist" && wishlistProducts.length === 0) || (activeTab === "products" && visibleProducts.length === 0)) && <Empty title="No products found" text="Please try another search or category."/>}
        </>}

        {activeTab === "product" && selectedProduct && <>
          <button style={styles.backButton} onClick={() => setActiveTab("products")}><ArrowLeft size={17}/> Back to products</button>
          <div style={styles.productDetail}>
            <div>
              <img src={imagesFor(selectedProduct)[selectedImage] || "https://placehold.co/600x700?text=Muddugumma"} alt={selectedProduct.name} style={styles.detailImage}/>
              <div style={styles.thumbRow}>{imagesFor(selectedProduct).map((url, i) => <button key={i} onClick={() => setSelectedImage(i)} style={styles.thumbButton}><img src={url} alt="" style={styles.thumb}/></button>)}</div>
            </div>
            <div><h1>{selectedProduct.name}</h1><p style={styles.price}>{money(selectedProduct.price)}</p>{selectedProduct.original_price > selectedProduct.price && <p style={styles.oldPrice}>{money(selectedProduct.original_price)}</p>}<p>{selectedProduct.description}</p>
              {productSizes(selectedProduct).length > 0 && <><h3>Select size</h3><div style={styles.optionRow}>{productSizes(selectedProduct).map((size) => <button key={size} style={selectedSize === size ? styles.optionActive : styles.option} onClick={() => setSelectedSize(size)}>{size}</button>)}</div></>}
              {productColors(selectedProduct).length > 0 && <><h3>Select colour</h3><div style={styles.optionRow}>{productColors(selectedProduct).map((color) => <button key={color} style={selectedColor === color ? styles.optionActive : styles.option} onClick={() => setSelectedColor(color)}>{color}</button>)}</div></>}
              <div style={styles.detailActions}><button style={styles.primaryButton} onClick={() => addToCart(selectedProduct)}>Add to cart</button><button style={styles.heartLarge} onClick={() => toggleWishlist(selectedProduct.id)}><Heart fill={wishlist.includes(selectedProduct.id) ? "#b8325b" : "none"}/></button></div>
            </div>
          </div>
        </>}

        {activeTab === "cart" && <>
          <h1>Your Cart</h1>
          {cart.length === 0 ? <Empty title="Your cart is empty" text="Explore our collection and add your favourites."/> : <div style={styles.cartLayout}>
            <div>{cart.map((item) => <div key={item.key} style={styles.cartItem}>
              <img src={item.image || "https://placehold.co/120x140?text=Product"} alt="" style={styles.cartImage}/>
              <div style={{ flex: 1 }}><strong>{item.name}</strong><p style={styles.muted}>{item.size && `Size: ${item.size}`} {item.color && ` • Colour: ${item.color}`}</p><b>{money(item.price)}</b><div style={styles.quantity}><button style={styles.quantityButton} onClick={() => changeQuantity(item.key, -1)}><Minus size={15}/></button><span>{item.quantity}</span><button style={styles.quantityButton} onClick={() => changeQuantity(item.key, 1)}><Plus size={15}/></button></div></div>
              <button style={styles.deleteButton} onClick={() => removeCartItem(item.key)}><Trash2 size={18}/></button>
            </div>)}</div>
            <aside style={styles.summary}><h3>Order summary</h3><p>Items ({cartCount}) <b>{money(cartTotal)}</b></p><hr/><h2>{money(cartTotal)}</h2>
              {session ? <button style={styles.primaryButton} disabled title="Online checkout will be enabled after secure Razorpay setup">Online payment coming soon</button> : <button style={styles.primaryButton} onClick={() => setScreen("welcome")}>Login to continue</button>}
              <p style={styles.smallMuted}>Online payment will be enabled after the secure Razorpay server setup. No COD is offered.</p>
            </aside>
          </div>}
        </>}

        {activeTab === "orders" && <div style={styles.emptyState}><Package size={40}/><h2>Order history</h2><p>Your orders will appear here after online checkout is connected.</p></div>}
      </main>

      <footer style={styles.footer}>
        <Brand settings={settings} title={brandTitle} line={brandLine}/>
        {settings?.contact_number && <p><Phone size={15}/> {settings.contact_number}</p>}
        {settings?.shop_address && <p><MapPin size={15}/> {settings.shop_address}</p>}
        <p>© {new Date().getFullYear()} Muddugumma. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Brand({ settings, title, line }) {
  return <div style={styles.authBrand}>
    {settings?.logo_url ? <img src={settings.logo_url} alt="Muddugumma logo" style={styles.authLogo}/> : <div style={styles.authLogoFallback}>M</div>}
    <div><h1>{title}</h1><p>{line}</p></div>
  </div>;
}

function ProductGrid({ products, wishlist, toggleWishlist, openProduct }) {
  return <div style={styles.productGrid}>{products.map((p) => {
    const image = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url;
    return <article key={p.id} style={styles.productCard}>
      <div style={styles.productImageWrap} onClick={() => openProduct(p)}>
        <img src={image || "https://placehold.co/400x500?text=Muddugumma"} alt={p.name} style={styles.productImage}/>
        <button style={styles.heartButton} onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }} aria-label="Wishlist"><Heart size={19} fill={wishlist.includes(p.id) ? "#b8325b" : "white"} color={wishlist.includes(p.id) ? "#b8325b" : "#555"}/></button>
      </div>
      <div style={styles.productInfo}><button style={styles.productName} onClick={() => openProduct(p)}>{p.name}</button><strong>{money(p.price)}</strong><button style={styles.smallAdd} onClick={() => openProduct(p)}>View product</button></div>
    </article>;
  })}</div>;
}

function Empty({ title, text }) {
  return <div style={styles.emptyState}><ShoppingBag size={38}/><h2>{title}</h2><p>{text}</p></div>;
}

const styles = {
  app: { minHeight: "100vh", background: "#fffaf7", color: "#332522", fontFamily: "Arial, sans-serif" },
  center: { minHeight: "100vh", display: "grid", placeContent: "center", justifyItems: "center", color: "#70483f" },
  spinner: { width: 34, height: 34, border: "4px solid #ead8d0", borderTopColor: "#9b4e62", borderRadius: "50%", animation: "spin 1s linear infinite" },
  authPage: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 18, background: "linear-gradient(135deg,#fff5ef,#f5e4e6)" },
  authCard: { width: "100%", maxWidth: 460, background: "white", padding: 28, borderRadius: 20, boxShadow: "0 12px 40px #6d3d3018", boxSizing: "border-box" },
  authBrand: { display: "flex", alignItems: "center", gap: 13, justifyContent: "center", textAlign: "left", marginBottom: 22 },
  authLogo: { width: 64, height: 64, objectFit: "contain", borderRadius: 12 },
  authLogoFallback: { width: 64, height: 64, display: "grid", placeItems: "center", background: "#9b4e62", color: "white", borderRadius: 14, fontSize: 34, fontFamily: "Georgia" },
  "authBrand h1": { fontSize: 21, margin: 0, color: "#743e50" },
  "authBrand p": { margin: "5px 0 0", color: "#876e68" },
  heading: { textAlign: "center", marginBottom: 5 }, muted: { color: "#8b7771" },
  tabs: { display: "flex", gap: 7, margin: "14px 0", background: "#f8efec", padding: 5, borderRadius: 12 },
  tab: { flex: 1, padding: "10px 8px", border: 0, borderRadius: 9, background: "transparent", color: "#765d57", cursor: "pointer" },
  tabActive: { flex: 1, padding: "10px 8px", border: 0, borderRadius: 9, background: "#fff", color: "#914c61", fontWeight: 700, boxShadow: "0 2px 8px #00000010", cursor: "pointer" },
  form: { display: "grid", gap: 11 },
  input: { width: "100%", padding: "13px 14px", border: "1px solid #e5d5d0", borderRadius: 10, boxSizing: "border-box", fontSize: 15, outlineColor: "#a45c70" },
  primaryButton: { border: 0, background: "#914c61", color: "white", padding: "13px 18px", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 15 },
  secondaryButton: { width: "100%", border: "1px solid #914c61", background: "white", color: "#914c61", padding: 13, borderRadius: 10, fontWeight: 700, cursor: "pointer" },
  textButton: { border: 0, background: "transparent", color: "#914c61", padding: 8, cursor: "pointer" },
  smallMuted: { fontSize: 12, color: "#98847e", lineHeight: 1.5, textAlign: "center" },
  orLine: { textAlign: "center", color: "#b6a19b", margin: "16px 0" },
  success: { display: "flex", gap: 7, alignItems: "center", color: "#247a50", fontSize: 13 },
  error: { display: "flex", gap: 7, alignItems: "center", color: "#b42318", fontSize: 13 },
  header: { background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4%", borderBottom: "1px solid #f0e3df", position: "sticky", top: 0, zIndex: 5 },
  brandButton: { display: "flex", alignItems: "center", gap: 10, border: 0, background: "transparent", textAlign: "left", cursor: "pointer", color: "#743e50" },
  logo: { width: 48, height: 48, objectFit: "contain" }, logoFallback: { width: 45, height: 45, display: "grid", placeItems: "center", borderRadius: 12, background: "#914c61", color: "#fff", fontSize: 25 },
  headerActions: { display: "flex", gap: 8, alignItems: "center" },
  iconButton: { position: "relative", border: 0, background: "transparent", padding: 9, color: "#714653", cursor: "pointer", display: "inline-flex" },
  count: { position: "absolute", top: 0, right: 0, background: "#914c61", color: "white", borderRadius: 20, fontSize: 10, minWidth: 16, textAlign: "center", fontStyle: "normal" },
  nav: { display: "flex", justifyContent: "center", gap: 10, background: "#fff", padding: "8px 10px", borderBottom: "1px solid #f0e3df" },
  navButton: { display: "flex", alignItems: "center", gap: 6, padding: "10px 15px", border: 0, background: "transparent", color: "#765d57", cursor: "pointer" },
  navActive: { display: "flex", alignItems: "center", gap: 6, padding: "10px 15px", border: 0, borderRadius: 20, background: "#f5e7e9", color: "#914c61", fontWeight: 700, cursor: "pointer" },
  main: { maxWidth: 1200, margin: "0 auto", padding: "25px 4% 55px", minHeight: "65vh" },
  hero: { minHeight: 260, display: "flex", alignItems: "center", padding: "35px 6%", borderRadius: 22, background: "linear-gradient(110deg,#f4e2df,#f8eeea)", marginBottom: 35, boxSizing: "border-box" },
  eyebrow: { letterSpacing: 3, fontSize: 12, color: "#9b596a", fontWeight: 700 },
  sectionTitle: { margin: "30px 0 18px", color: "#653b47" },
  categoryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 12 },
  categoryCard: { minHeight: 105, padding: 14, border: "1px solid #eedbd8", borderRadius: 14, background: "#fff", color: "#704653", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontWeight: 700 },
  categoryImage: { width: 65, height: 65, objectFit: "cover", borderRadius: 10 },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 18 },
  productCard: { background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #f0e4e0" },
  productImageWrap: { position: "relative", cursor: "pointer" },
  productImage: { width: "100%", height: 260, objectFit: "cover", display: "block", background: "#f6eeeb" },
  heartButton: { position: "absolute", right: 10, top: 10, width: 36, height: 36, border: 0, borderRadius: "50%", background: "#ffffffed", display: "grid", placeItems: "center", cursor: "pointer" },
  productInfo: { padding: 12, display: "grid", gap: 8 },
  productName: { border: 0, background: "transparent", textAlign: "left", color: "#543942", fontWeight: 700, cursor: "pointer", padding: 0 },
  smallAdd: { border: "1px solid #914c61", borderRadius: 8, background: "white", color: "#914c61", padding: 8, cursor: "pointer" },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" },
  searchBox: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #eadbd6", borderRadius: 10, padding: "10px 12px" },
  categoryChips: { display: "flex", flexWrap: "wrap", gap: 8, margin: "18px 0" },
  chip: { border: "1px solid #e7d5d1", background: "white", color: "#765d57", borderRadius: 20, padding: "8px 14px", cursor: "pointer" },
  chipActive: { border: "1px solid #914c61", background: "#914c61", color: "white", borderRadius: 20, padding: "8px 14px", cursor: "pointer" },
  productDetail: { display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 35, marginTop: 20 },
  detailImage: { width: "100%", maxHeight: 620, objectFit: "contain", background: "#f7efec", borderRadius: 16 },
  thumbRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  thumbButton: { border: "1px solid #eadbd6", padding: 3, borderRadius: 8, background: "white", cursor: "pointer" },
  thumb: { width: 58, height: 65, objectFit: "cover", display: "block" },
  price: { color: "#914c61", fontSize: 24, fontWeight: 700 }, oldPrice: { color: "#998780", textDecoration: "line-through" },
  optionRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  option: { border: "1px solid #ddc9c4", background: "white", padding: "9px 14px", borderRadius: 8, cursor: "pointer" },
  optionActive: { border: "1px solid #914c61", background: "#f6e8eb", color: "#914c61", padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 },
  detailActions: { display: "flex", gap: 12, marginTop: 25 },
  heartLarge: { border: "1px solid #e5d5d0", borderRadius: 10, background: "white", color: "#b8325b", padding: 12, cursor: "pointer" },
  backButton: { display: "flex", alignItems: "center", gap: 7, border: 0, background: "transparent", color: "#914c61", cursor: "pointer" },
  cartLayout: { display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(260px,1fr)", gap: 25, alignItems: "start" },
  cartItem: { display: "flex", gap: 15, alignItems: "center", padding: 14, background: "white", border: "1px solid #eee0dc", borderRadius: 12, marginBottom: 12 },
  cartImage: { width: 90, height: 110, objectFit: "cover", borderRadius: 8, background: "#f7efec" },
  quantity: { display: "flex", alignItems: "center", gap: 12, marginTop: 10 },
  quantityButton: { border: 0, background: "#f5e8e8", borderRadius: 6, padding: 6, cursor: "pointer" },
  deleteButton: { border: 0, background: "transparent", color: "#a34c5d", cursor: "pointer" },
  summary: { background: "white", border: "1px solid #eee0dc", borderRadius: 14, padding: 18 },
  emptyState: { textAlign: "center", padding: "65px 15px", color: "#8a6c67" },
  notice: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10, background: "#55343f", color: "white", padding: "12px 18px", borderRadius: 10, display: "flex", gap: 12, alignItems: "center", cursor: "pointer" },
  bannerRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 20 },
  banner: { width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14 },
  footer: { background: "#f4e7e4", padding: "30px 5%", textAlign: "center", color: "#765d57" },
  authBrand: { display: "flex", alignItems: "center", gap: 13, justifyContent: "center", textAlign: "left", marginBottom: 22 },
  authLogo: { width: 64, height: 64, objectFit: "contain", borderRadius: 12 },
  authLogoFallback: { width: 64, height: 64, display: "grid", placeItems: "center", background: "#9b4e62", color: "white", borderRadius: 14, fontSize: 34 },
};
