import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import CustomerStore from "./CustomerStore";
import {
  LayoutDashboard, ShoppingBag, Tags, Truck, LogOut, Plus, Search,
  Pencil, Trash2, RefreshCw, Menu, X, IndianRupee, ClipboardList,
  Lock, AlertCircle, CheckCircle, ExternalLink, Settings, Image as ImageIcon,
  Save, Eye, Package, Upload
} from "lucide-react";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));

const dateFormat = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";
const inputStyle = {
  width: "100%", padding: "11px 12px", border: "1px solid #e5d5dc",
  borderRadius: 9, fontSize: 14, marginTop: 6, outlineColor: "#a54d70",
  boxSizing: "border-box"
};
const buttonStyle = {
  border: "none", borderRadius: 9, padding: "10px 14px",
  cursor: "pointer", fontWeight: 600, display: "inline-flex",
  alignItems: "center", justifyContent: "center", gap: 7
};
const primaryButton = { ...buttonStyle, background: "#75435c", color: "#fff" };
const secondaryButton = { ...buttonStyle, background: "#f5eaf0", color: "#75435c" };

export default function App() {
  if (window.location.pathname === "/shop") return <CustomerStore />;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [parcelSlips, setParcelSlips] = useState([]);
  const [settings, setSettings] = useState({
    id: "main", logo_url: "", welcome_title: "Welcome to Muddugumma",
    brand_line: "Muddugumma by Lakshmi", contact_number: "",
    shop_address: "", feedback_text: "", banner_urls: []
  });

  const [categoryName, setCategoryName] = useState("");
  const [categoryParent, setCategoryParent] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const emptyProduct = {
    name: "", description: "", price: "", original_price: "", sku: "",
    category_id: "", sizesText: "", colorsText: "", is_available: true, is_active: true
  };
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productFiles, setProductFiles] = useState([]);
  const [productPreviews, setProductPreviews] = useState([]);

  const [settingsFiles, setSettingsFiles] = useState({ logo: null, banners: [] });
  const [settingsPreviews, setSettingsPreviews] = useState({ logo: "", banners: [] });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error: authError }) => {
      if (authError) setLoginError(authError.message);
      setSession(data?.session || null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadAllData();
  }, [session]);

  async function loadAllData() {
    setDataLoading(true);
    setError("");
    const [p, c, o, s, st] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("parcel_slips").select("*").order("created_at", { ascending: false }),
      supabase.from("store_settings").select("*").limit(1).maybeSingle()
    ]);
    if (p.error) setError("Products: " + p.error.message); else setProducts(p.data || []);
    if (c.error) console.error("Categories:", c.error.message); else setCategories(c.data || []);
    if (o.error) console.error("Orders:", o.error.message); else setOrders(o.data || []);
    if (s.error) console.error("Parcel slips:", s.error.message); else setParcelSlips(s.data || []);
    if (st.error) console.error("Store settings:", st.error.message);
    else if (st.data) setSettings({ ...settings, ...st.data, banner_urls: st.data.banner_urls || [] });
    setDataLoading(false);
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setLoginError(signInError.message); setLoading(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setProducts([]); setCategories([]); setOrders([]); setParcelSlips([]);
  }

  function startEditCategory(category) {
    setEditingCategory(category);
    setCategoryName(category.name || "");
    setCategoryParent(category.parent_id || "");
    setError(""); setSuccess("");
  }
  function cancelEditCategory() {
    setEditingCategory(null); setCategoryName(""); setCategoryParent("");
  }

  async function saveCategory(event) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return setError("Please enter a category name.");
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (categoryParent && editingCategory?.id === categoryParent) return setError("A category cannot be its own parent.");
    setSavingCategory(true); setError(""); setSuccess("");
    const payload = { name, slug, parent_id: categoryParent || null, is_active: true };
    const result = editingCategory
      ? await supabase.from("categories").update(payload).eq("id", editingCategory.id)
      : await supabase.from("categories").insert(payload);
    if (result.error) setError("Could not save category: " + result.error.message);
    else { setSuccess(editingCategory ? "Category updated!" : "Category added!"); cancelEditCategory(); await loadAllData(); }
    setSavingCategory(false);
  }

  async function deleteCategory(category) {
    const { data: linkedProducts, error: checkError } = await supabase
      .from("products").select("id").eq("category_id", category.id).limit(1);
    if (checkError) return setError("Could not check products: " + checkError.message);
    const { data: children, error: childError } = await supabase
      .from("categories").select("id").eq("parent_id", category.id).limit(1);
    if (childError) return setError(childError.message);
    if (linkedProducts?.length || children?.length) return setError("This category has products or subcategories. Move them first.");
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", category.id);
    if (deleteError) setError(deleteError.message);
    else { setSuccess("Category deleted."); await loadAllData(); }
  }

  function openNewProduct() {
    setEditingProduct(null); setProductForm(emptyProduct);
    setProductFiles([]); setProductPreviews([]); setShowProductForm(true);
  }
  function openEditProduct(product) {
    const urls = product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : []);
    setEditingProduct(product);
    setProductForm({
      name: product.name || "", description: product.description || "",
      price: product.price ?? "", original_price: product.original_price ?? "",
      sku: product.sku || "", category_id: product.category_id || "",
      sizesText: (product.sizes || []).join(", "), colorsText: (product.colors || []).join(", "),
      is_available: product.is_available ?? true, is_active: product.is_active ?? true
    });
    setProductFiles([]); setProductPreviews(urls); setShowProductForm(true);
  }

  async function uploadImage(file, folder) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type
    });
    if (uploadError) throw uploadError;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const sizes = [...new Set(productForm.sizesText.split(",").map(x => x.trim()).filter(Boolean))];
      const colors = [...new Set(productForm.colorsText.split(",").map(x => x.trim()).filter(Boolean))];
      const uploaded = [];
      for (const file of productFiles) uploaded.push(await uploadImage(file, "products"));
      const existingUrls = productPreviews.filter(url => typeof url === "string" && url.startsWith("http"));
      const imageUrls = [...existingUrls, ...uploaded];
      const payload = {
        name: productForm.name.trim(), description: productForm.description.trim() || null,
        price: Number(productForm.price),
        original_price: productForm.original_price === "" ? null : Number(productForm.original_price),
        sku: productForm.sku.trim() || null, category_id: productForm.category_id || null,
        sizes, colors, image_urls: imageUrls, image_url: imageUrls[0] || null,
        is_available: productForm.is_available, is_active: productForm.is_active
      };
      if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0) throw new Error("Enter a valid product name and price.");
      const result = editingProduct
        ? await supabase.from("products").update(payload).eq("id", editingProduct.id)
        : await supabase.from("products").insert(payload);
      if (result.error) throw result.error;
      setSuccess(editingProduct ? "Product updated!" : "Product added!");
      setShowProductForm(false); await loadAllData();
    } catch (e) { setError(e.message || "Could not save product."); }
    setSaving(false);
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from("products").delete().eq("id", product.id);
    if (deleteError) setError(deleteError.message);
    else { setSuccess("Product deleted."); await loadAllData(); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (savingSettings) return;

    setSavingSettings(true);
    setError("");
    setSuccess("");

    try {
      let logoUrl = settings.logo_url || null;

      if (settingsFiles.logo) {
        logoUrl = await uploadImage(settingsFiles.logo, "store");
      }

      const uploadedBanners = [];
      for (const file of settingsFiles.banners) {
        uploadedBanners.push(await uploadImage(file, "banners"));
      }

      const payload = {
        id: settings.id || "main",
        logo_url: logoUrl,
        welcome_title: settings.welcome_title || "Welcome to Muddugumma",
        brand_line: settings.brand_line || "",
        contact_number: settings.contact_number || "",
        shop_address: settings.shop_address || "",
        feedback_text: settings.feedback_text || "",
        banner_urls: [...(settings.banner_urls || []), ...uploadedBanners],
        updated_at: new Date().toISOString()
      };

      // Check the lookup result instead of silently ignoring database errors.
      const { data: existing, error: lookupError } = await supabase
        .from("store_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (lookupError) throw lookupError;

      let savedRow = null;

      if (existing?.id) {
        const { data, error: updateError } = await supabase
          .from("store_settings")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          throw new Error("No store settings row was updated. Please check the owner access policy for store_settings.");
        }
        savedRow = data;
      } else {
        const { data, error: insertError } = await supabase
          .from("store_settings")
          .insert(payload)
          .select("*")
          .single();

        if (insertError) throw insertError;
        savedRow = data;
      }

      // Only show success after Supabase returns the saved row.
      if (!savedRow?.id) {
        throw new Error("The database did not confirm that the store settings were saved.");
      }

      setSettings({ ...savedRow, banner_urls: savedRow.banner_urls || [] });
      setSettingsFiles({ logo: null, banners: [] });
      setSettingsPreviews({ logo: "", banners: [] });
      setSuccess("Store details saved successfully and are now available to customers.");
      await loadAllData();
    } catch (e) {
      setError("Could not save store details: " + (e?.message || "Unknown error"));
    } finally {
      setSavingSettings(false);
    }
  }

  async function deleteParcelRecord(slip) {
    if (!window.confirm("Delete this parcel slip record? This does not delete the actual file stored elsewhere.")) return;
    const { error: deleteError } = await supabase.from("parcel_slips").delete().eq("id", slip.id);
    if (deleteError) setError(deleteError.message);
    else { setSuccess("Parcel slip record deleted."); await loadAllData(); }
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "categories", label: "Categories", icon: Tags },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "parcels", label: "Parcel Slips", icon: Truck },
    { id: "settings", label: "Store Settings", icon: Settings }
  ];
  const filteredProducts = useMemo(() => products.filter(p =>
    `${p.name || ""} ${p.sku || ""}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);
  const parentCategories = categories.filter(c => !c.parent_id);
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || "—";

  if (loading) return <div style={centerStyle}>Loading Muddugumma Clothing...</div>;
  if (!session) return (
    <div style={loginBackground}>
      <form onSubmit={login} style={loginCard}>
        <div style={brandIcon}>M</div>
        <h1 style={{ color: "#542d40", marginBottom: 5 }}>Muddugumma</h1>
        <p style={{ color: "#967482", marginBottom: 28 }}>Clothing · Owner Dashboard</p>
        <h2 style={{ fontSize: 21, marginBottom: 20 }}>Owner Login</h2>
        <label>Email address</label>
        <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
        <label style={{ display: "block", marginTop: 17 }}>Password</label>
        <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
        {loginError && <p style={errorStyle}>{loginError}</p>}
        <button type="submit" disabled={loading} style={{ ...primaryButton, width: "100%", marginTop: 22 }}><Lock size={17} /> Sign in</button>
        <p style={{ fontSize: 12, color: "#987e89", marginTop: 20 }}>Secure sign-in powered by Supabase</p>
      </form>
    </div>
  );

  return (
    <div style={appStyle}>
      <style>{`
        @media (max-width: 760px) {
          aside { display: none !important; }
          aside[style*="position: fixed"] { display: flex !important; }
          .muddugumma-mobile-menu { display: inline-flex !important; }
        }
        @media (min-width: 761px) {
          .muddugumma-mobile-menu { display: none !important; }
        }
        table th, table td { padding: 12px 10px; border-bottom: 1px solid #f0e5e9; vertical-align: top; }
        input, textarea, select, button { font-family: inherit; }
      `}</style>
      <aside style={{ ...sidebarStyle, ...(mobileMenu ? mobileSidebarOpen : {}) }}>
        <div style={logoArea}>
          {settings.logo_url ? <img src={settings.logo_url} alt="Muddugumma logo" style={sidebarLogo} /> : <div style={smallLogo}>M</div>}
          <div><b>Muddugumma</b><small style={{ display: "block", color: "#d6b8c5" }}>CLOTHING</small></div>
          <button className="muddugumma-mobile-menu" style={mobileClose} onClick={() => setMobileMenu(false)}><X /></button>
        </div>
        <p style={sideHeading}>MAIN MENU</p>
        {navItems.map(item => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => { setPage(item.id); setMobileMenu(false); setSearch(""); setError(""); setSuccess(""); }}
            style={{ ...navButton, background: page === item.id ? "#75435c" : "transparent", color: page === item.id ? "#fff" : "#dbcbd2" }}>
            <Icon size={19} />{item.label}
            {item.id === "orders" && orders.length > 0 && <span style={navCount}>{orders.length}</span>}
          </button>;
        })}
        <div style={{ flex: 1 }} />
        <div style={ownerBox}>
          <div style={avatar}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}><b>Owner</b><small style={ownerEmail}>{session.user.email}</small></div>
          <button onClick={logout} title="Logout" style={logoutButton}><LogOut size={18} /></button>
        </div>
      </aside>

      <main style={mainStyle}>
        <header style={topbar}>
          <button className="muddugumma-mobile-menu" onClick={() => setMobileMenu(!mobileMenu)} style={menuButton}><Menu /></button>
          <div><b style={{ color: "#542d40" }}>Muddugumma Clothing</b><span style={topSubtitle}> / Owner Panel</span></div>
          <button onClick={loadAllData} style={refreshButton}><RefreshCw size={16} /><span>Refresh</span></button>
        </header>

        <section style={contentStyle}>
          <div style={pageHeader}><div>
            <h1 style={{ color: "#482b39", fontSize: 25, margin: 0 }}>{navItems.find(n => n.id === page)?.label}</h1>
            <p style={{ color: "#987b89", marginTop: 7 }}>Welcome to your clothing business dashboard.</p>
          </div></div>
          {error && <div style={errorBanner}><AlertCircle size={18} />{error}<button onClick={() => setError("")} style={dismissButton}><X size={16} /></button></div>}
          {success && <div style={successBanner}><CheckCircle size={18} />{success}<button onClick={() => setSuccess("")} style={dismissButton}><X size={16} /></button></div>}
          {dataLoading && <p style={{ color: "#967482" }}>Loading your business data...</p>}

          {page === "dashboard" && <>
            <div style={statsGrid}>
              <StatCard icon={<ShoppingBag />} title="Total Products" value={products.length} color="#a44d70" />
              <StatCard icon={<ClipboardList />} title="Total Orders" value={orders.length} color="#547ca8" />
              <StatCard icon={<Tags />} title="Categories" value={categories.length} color="#8b70a8" />
              <StatCard icon={<Truck />} title="Parcel Slips" value={parcelSlips.length} color="#59927c" />
            </div>
            <div style={panelStyle}>
              <div style={panelHeader}><h3>Recent Orders</h3><button onClick={() => setPage("orders")} style={textButton}>View all</button></div>
              {orders.length === 0 ? <EmptyState text="No orders found yet." /> : <TableWrap>
                <table style={tableStyle}><thead><tr><th>Order Number</th><th>Date</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th></tr></thead>
                  <tbody>{orders.slice(0, 5).map(order => <tr key={order.id}>
                    <td>#{order.order_number}</td><td>{dateFormat(order.created_at)}</td><td>{order.full_name || "Customer"}</td>
                    <td>{money(order.total_amount)}</td><td><Status value={order.payment_status || "pending"} /></td><td><Status value={order.order_status || "pending"} /></td>
                  </tr>)}</tbody></table></TableWrap>}
            </div>
            <div style={panelStyle}><div style={panelHeader}><h3>Recently Added Products</h3><button onClick={() => setPage("products")} style={textButton}>View products</button></div>
              {products.length === 0 ? <EmptyState text="Add your first clothing product." /> : <div style={productGrid}>
                {products.slice(0, 4).map(p => <div key={p.id} style={miniProduct}>{p.image_url && <img src={p.image_url} alt={p.name} style={miniImage} />}<b>{p.name}</b><strong style={{ color: "#a44d70" }}>{money(p.price)}</strong></div>)}
              </div>}
            </div>
          </>}

          {page === "products" && <div style={panelStyle}>
            <div style={panelHeader}><h3>Manage Products ({products.length})</h3><button onClick={openNewProduct} style={primaryButton}><Plus size={17} /> Add Product</button></div>
            <SearchBar value={search} onChange={setSearch} />
            {filteredProducts.length === 0 ? <EmptyState text="No products found. Add your first product." /> : <TableWrap>
              <table style={tableStyle}><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sizes / Colours</th><th>Availability</th><th>Actions</th></tr></thead>
                <tbody>{filteredProducts.map(product => <tr key={product.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}>{product.image_url && <img src={product.image_url} alt="" style={tableImage} />}<div><b>{product.name}</b><small style={mutedCell}>{product.sku || ""}</small></div></div></td>
                  <td>{getCategoryName(product.category_id)}</td><td>{money(product.price)}</td>
                  <td>{(product.sizes || []).join(", ") || "—"}<small style={mutedCell}>{(product.colors || []).join(", ")}</small></td>
                  <td><Status value={product.is_available ? "Available" : "Unavailable"} /></td>
                  <td><div style={{ display: "flex", gap: 7 }}><button style={iconButton} onClick={() => openEditProduct(product)} title="Edit"><Pencil size={16} /></button><button style={{ ...iconButton, color: "#c34d58" }} onClick={() => deleteProduct(product)} title="Delete"><Trash2 size={16} /></button></div></td>
                </tr>)}</tbody></table></TableWrap>}
          </div>}

          {page === "categories" && <div style={panelStyle}>
            <h3 style={{ marginBottom: 18 }}>Manage Categories and Subcategories</h3>
            <form onSubmit={saveCategory} style={categoryForm}>
              <div style={{ flex: "1 1 180px" }}><label>Category name</label><input style={inputStyle} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Kurtis" required /></div>
              <div style={{ flex: "1 1 180px" }}><label>Parent category (optional)</label><select style={inputStyle} value={categoryParent} onChange={e => setCategoryParent(e.target.value)}><option value="">Main category</option>{parentCategories.filter(c => c.id !== editingCategory?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <button type="submit" disabled={savingCategory} style={primaryButton}>{savingCategory ? "Saving..." : editingCategory ? "Update" : "Add Category"}</button>
              {editingCategory && <button type="button" onClick={cancelEditCategory} style={secondaryButton}>Cancel</button>}
            </form>
            {categories.length === 0 ? <EmptyState text="No categories yet." /> : <div style={categoryGrid}>
              {categories.map(category => <div key={category.id} style={categoryCard}><Tags color="#a44d70" /><b>{category.name}</b><small style={{ color: "#987b89" }}>{category.parent_id ? `Subcategory of ${getCategoryName(category.parent_id)}` : "Main category"}</small>
                <div style={{ display: "flex", gap: 8 }}><button style={iconButton} onClick={() => startEditCategory(category)} title="Edit"><Pencil size={16} /></button><button style={{ ...iconButton, color: "#c34d58" }} onClick={() => deleteCategory(category)} title="Delete"><Trash2 size={16} /></button></div>
              </div>)}
            </div>}
          </div>}

          {page === "orders" && <div style={panelStyle}><div style={panelHeader}><h3>Customer Orders ({orders.length})</h3></div>
            {orders.length === 0 ? <EmptyState text="No customer orders available yet." /> : <TableWrap>
              <table style={tableStyle}><thead><tr><th>Order Number</th><th>Date</th><th>Customer</th><th>Phone</th><th>Delivery Address</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
                <tbody>{orders.map(order => <tr key={order.id}><td>#{order.order_number}</td><td>{dateFormat(order.created_at)}</td><td>{order.full_name}</td><td>{order.phone}</td><td>{[order.address, order.city, order.state, order.pincode].filter(Boolean).join(", ")}</td><td>{money(order.total_amount)}</td><td><Status value={order.payment_status || "pending"} /></td><td><Status value={order.order_status || "pending"} /></td></tr>)}</tbody></table></TableWrap>}
          </div>}

          {page === "parcels" && <div style={panelStyle}><div style={panelHeader}><h3>Parcel Slip Records ({parcelSlips.length})</h3></div>
            <p style={{ color: "#987b89", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>Records are grouped by their saved parcel date. OneDrive file upload and automatic organisation will be connected in a later stage; deleting a record here does not delete a remote file.</p>
            {parcelSlips.length === 0 ? <EmptyState text="No parcel slip records found." /> : <TableWrap>
              <table style={tableStyle}><thead><tr><th>Parcel Date</th><th>Order ID</th><th>File Name</th><th>File</th><th>Actions</th></tr></thead>
                <tbody>{parcelSlips.map(slip => <tr key={slip.id}><td>{dateFormat(slip.parcel_date || slip.created_at)}</td><td>{slip.order_id || "—"}</td><td>{slip.file_name || "Parcel slip"}</td><td>{slip.file_url ? <a href={slip.file_url} target="_blank" rel="noreferrer">Open file</a> : "—"}</td><td><button onClick={() => deleteParcelRecord(slip)} style={{ ...iconButton, color: "#c34d58" }} title="Delete record"><Trash2 size={16} /></button></td></tr>)}</tbody></table></TableWrap>}
          </div>}

          {page === "settings" && <div style={panelStyle}>
            <div style={panelHeader}><h3>Store branding and contact details</h3><span style={{ color: "#987b89", fontSize: 12 }}>Shown on your customer shop</span></div>
            <form onSubmit={saveSettings}>
              <label>Store logo</label>
              {settings.logo_url && !settingsPreviews.logo && <img src={settings.logo_url} alt="Current store logo" style={logoPreview} />}
              {settingsPreviews.logo && <img src={settingsPreviews.logo} alt="New logo preview" style={logoPreview} />}
              <input type="file" accept="image/*" style={inputStyle} onChange={e => { const file = e.target.files?.[0]; if (file) { setSettingsFiles(v => ({ ...v, logo: file })); setSettingsPreviews(v => ({ ...v, logo: URL.createObjectURL(file) })); } }} />
              <label style={formLabel}>Welcome heading</label><input style={inputStyle} value={settings.welcome_title || ""} onChange={e => setSettings(v => ({ ...v, welcome_title: e.target.value }))} placeholder="Welcome to Muddugumma" />
              <label style={formLabel}>Brand line</label><input style={inputStyle} value={settings.brand_line || ""} onChange={e => setSettings(v => ({ ...v, brand_line: e.target.value }))} placeholder="Muddugumma by Lakshmi" />
              <label style={formLabel}>Contact number</label><input style={inputStyle} value={settings.contact_number || ""} onChange={e => setSettings(v => ({ ...v, contact_number: e.target.value }))} placeholder="Business contact number" />
              <label style={formLabel}>Shop address</label><textarea style={{ ...inputStyle, minHeight: 75 }} value={settings.shop_address || ""} onChange={e => setSettings(v => ({ ...v, shop_address: e.target.value }))} placeholder="Shop address" />
              <label style={formLabel}>Feedback message / instructions</label><textarea style={{ ...inputStyle, minHeight: 75 }} value={settings.feedback_text || ""} onChange={e => setSettings(v => ({ ...v, feedback_text: e.target.value }))} placeholder="Invite customers to share feedback" />
              <label style={formLabel}>Store banners / posters</label>
              {settings.banner_urls?.length > 0 && <div style={bannerGrid}>{settings.banner_urls.map((url, i) => <div key={`${url}-${i}`} style={{ position: "relative" }}><img src={url} alt={`Banner ${i + 1}`} style={bannerPreview} /><button type="button" onClick={() => setSettings(v => ({ ...v, banner_urls: v.banner_urls.filter((_, index) => index !== i) }))} style={removeBanner}><X size={14} /></button></div>)}</div>}
              {settingsPreviews.banners.length > 0 && <div style={bannerGrid}>{settingsPreviews.banners.map((url, i) => <img key={i} src={url} alt="New banner preview" style={bannerPreview} />)}</div>}
              <input type="file" accept="image/*" multiple style={inputStyle} onChange={e => { const files = Array.from(e.target.files || []); setSettingsFiles(v => ({ ...v, banners: [...v.banners, ...files] })); setSettingsPreviews(v => ({ ...v, banners: [...v.banners, ...files.map(f => URL.createObjectURL(f))] })); }} />
              <button type="submit" disabled={savingSettings} style={{ ...primaryButton, marginTop: 22 }}><Save size={17} />{savingSettings ? "Saving..." : "Save Store Settings"}</button>
            </form>
          </div>}

          <footer style={footerStyle}>© {new Date().getFullYear()} Muddugumma Clothing · Owner Dashboard</footer>
        </section>
      </main>

      {showProductForm && <div style={modalOverlay}><form onSubmit={saveProduct} style={modalStyle}>
        <div style={panelHeader}><h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2><button type="button" onClick={() => setShowProductForm(false)} style={iconButton}><X /></button></div>
        <label>Product name *</label><input style={inputStyle} value={productForm.name} onChange={e => setProductForm(v => ({ ...v, name: e.target.value }))} required />
        <label style={formLabel}>Description</label><textarea style={{ ...inputStyle, minHeight: 75 }} value={productForm.description} onChange={e => setProductForm(v => ({ ...v, description: e.target.value }))} />
        <label style={formLabel}>Product photos (you can select multiple)</label>
        {productPreviews.length > 0 && <div style={bannerGrid}>{productPreviews.map((url, i) => <div key={`${url}-${i}`} style={{ position: "relative" }}><img src={url} alt={`Product ${i + 1}`} style={productPreview} /><button type="button" style={removeBanner} onClick={() => setProductPreviews(v => v.filter((_, index) => index !== i))}><X size={14} /></button></div>)}</div>}
        <input type="file" accept="image/*" multiple style={inputStyle} onChange={e => { const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024); if (files.length !== (e.target.files?.length || 0)) setError("Only image files up to 5 MB each are accepted."); setProductFiles(v => [...v, ...files]); setProductPreviews(v => [...v, ...files.map(f => URL.createObjectURL(f))]); e.target.value = ""; }} />
        <p style={hintStyle}>JPG, PNG or WEBP · Maximum 5 MB per image.</p>
        <div style={formGrid}>
          <div><label>Price (₹) *</label><input style={inputStyle} type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm(v => ({ ...v, price: e.target.value }))} required /></div>
          <div><label>Original price (₹)</label><input style={inputStyle} type="number" min="0" step="0.01" value={productForm.original_price} onChange={e => setProductForm(v => ({ ...v, original_price: e.target.value }))} /></div>
        </div>
        <label style={formLabel}>SKU / Product code</label><input style={inputStyle} value={productForm.sku} onChange={e => setProductForm(v => ({ ...v, sku: e.target.value }))} />
        <label style={formLabel}>Category or subcategory</label><select style={inputStyle} value={productForm.category_id} onChange={e => setProductForm(v => ({ ...v, category_id: e.target.value }))}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.parent_id ? `— ${getCategoryName(c.parent_id)} / ` : ""}{c.name}</option>)}</select>
        <label style={formLabel}>Available sizes (separate with commas)</label><input style={inputStyle} value={productForm.sizesText} onChange={e => setProductForm(v => ({ ...v, sizesText: e.target.value }))} placeholder="S, M, L, XL, Free Size" />
        <label style={formLabel}>Available colours (separate with commas)</label><input style={inputStyle} value={productForm.colorsText} onChange={e => setProductForm(v => ({ ...v, colorsText: e.target.value }))} placeholder="Pink, Black, Blue" />
        <label style={checkLabel}><input type="checkbox" checked={productForm.is_available} onChange={e => setProductForm(v => ({ ...v, is_available: e.target.checked }))} /> Product available for sale</label>
        <label style={checkLabel}><input type="checkbox" checked={productForm.is_active} onChange={e => setProductForm(v => ({ ...v, is_active: e.target.checked }))} /> Product active / visible in shop</label>
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}><button type="button" style={secondaryButton} onClick={() => setShowProductForm(false)}>Cancel</button><button type="submit" disabled={saving} style={primaryButton}>{saving ? "Saving..." : "Save Product"}</button></div>
      </form></div>}
    </div>
  );
}

function TableWrap({ children }) { return <div style={{ overflowX: "auto", width: "100%" }}>{children}</div>; }
function StatCard({ icon, title, value, color }) {
  return <div style={statCard}><div style={{ ...statIcon, background: color + "18", color }}>{icon}</div><div><p style={{ color: "#987b89", fontSize: 13, margin: 0 }}>{title}</p><h2 style={{ color: "#482b39", marginTop: 6 }}>{value}</h2></div></div>;
}
function SearchBar({ value, onChange }) {
  return <div style={searchBox}><Search size={18} color="#987b89" /><input value={value} onChange={e => onChange(e.target.value)} placeholder="Search products..." style={{ border: "none", outline: "none", width: "100%", background: "transparent" }} /></div>;
}
function Status({ value }) {
  const text = String(value || "pending");
  const positive = ["delivered", "completed", "available", "active", "paid", "success"].includes(text.toLowerCase());
  return <span style={{ background: positive ? "#e5f5ed" : "#fff2df", color: positive ? "#28764d" : "#a36b25", borderRadius: 20, padding: "5px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{text}</span>;
}
function EmptyState({ text }) { return <div style={emptyStyle}><Package size={32} color="#c6a7b5" /><p>{text}</p></div>; }

const centerStyle = { minHeight: "100vh", display: "grid", placeItems: "center", color: "#75435c", background: "#fffaf7", fontSize: 18 };
const loginBackground = { minHeight: "100vh", background: "linear-gradient(135deg,#f9eaf0,#fffaf7,#f3e2e9)", display: "grid", placeItems: "center", padding: 20 };
const loginCard = { width: "100%", maxWidth: 410, background: "#fff", borderRadius: 20, padding: 35, boxShadow: "0 15px 55px #75435c18", color: "#542d40", boxSizing: "border-box" };
const brandIcon = { width: 55, height: 55, background: "#75435c", color: "#fff", borderRadius: 16, display: "grid", placeItems: "center", fontSize: 27, fontWeight: 800, marginBottom: 20 };
const errorStyle = { color: "#b42335", fontSize: 13, marginTop: 12 };
const appStyle = { minHeight: "100vh", display: "flex", background: "#fffaf8", fontFamily: "Arial, sans-serif", color: "#49313c" };
const sidebarStyle = { width: 255, minWidth: 255, background: "#402735", minHeight: "100vh", padding: 20, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", zIndex: 10, boxSizing: "border-box" };
const mobileSidebarOpen = { position: "fixed", left: 0, top: 0, bottom: 0, boxShadow: "10px 0 35px #0003" };
const logoArea = { display: "flex", alignItems: "center", gap: 12, color: "#fff", padding: "8px 0 28px" };
const smallLogo = { width: 40, height: 40, background: "#a65b7c", borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 21 };
const sidebarLogo = { width: 42, height: 42, objectFit: "contain", borderRadius: 8, background: "#fff" };
const sideHeading = { color: "#bda3b0", fontSize: 11, fontWeight: 700, letterSpacing: 1.4, margin: "10px 0 13px" };
const navButton = { display: "flex", alignItems: "center", gap: 12, border: "none", borderRadius: 9, padding: "13px 12px", width: "100%", textAlign: "left", marginBottom: 5, cursor: "pointer", fontSize: 14 };
const navCount = { marginLeft: "auto", background: "#a65b7c", borderRadius: 15, padding: "3px 8px", fontSize: 11 };
const ownerBox = { display: "flex", alignItems: "center", gap: 10, paddingTop: 18, borderTop: "1px solid #624655", color: "#fff", fontSize: 13 };
const avatar = { background: "#a65b7c", width: 35, height: 35, borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0 };
const ownerEmail = { display: "block", color: "#c9aeb9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 145 };
const logoutButton = { background: "transparent", color: "#e6d5dd", border: "none", cursor: "pointer", padding: 8 };
const mainStyle = { flex: 1, minWidth: 0 };
const topbar = { minHeight: 72, background: "#fff", borderBottom: "1px solid #f0e5e9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 28px", position: "sticky", top: 0, zIndex: 5, boxSizing: "border-box" };
const topSubtitle = { color: "#b49ba6", fontSize: 13 };
const refreshButton = { ...buttonStyle, color: "#75435c", background: "#f8edf2" };
const menuButton = { display: "none", border: "none", background: "transparent", color: "#75435c", cursor: "pointer" };
const mobileClose = { display: "none", marginLeft: "auto", color: "#fff", border: "none", background: "transparent" };
const contentStyle = { maxWidth: 1500, margin: "0 auto", padding: 28, boxSizing: "border-box" };
const pageHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 17, marginBottom: 23 };
const statCard = { background: "#fff", padding: 22, borderRadius: 13, border: "1px solid #f0e5e9", display: "flex", alignItems: "center", gap: 16 };
const statIcon = { width: 47, height: 47, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 };
const panelStyle = { background: "#fff", border: "1px solid #f0e5e9", borderRadius: 13, padding: 21, marginBottom: 22, minWidth: 0, boxSizing: "border-box" };
const panelHeader = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" };
const textButton = { border: "none", background: "transparent", color: "#a44d70", cursor: "pointer", fontWeight: 700 };
const tableStyle = { borderCollapse: "collapse", width: "100%", textAlign: "left", fontSize: 13, minWidth: 720 };
const mutedCell = { display: "block", color: "#a58c98", fontSize: 11, marginTop: 5 };
const iconButton = { background: "#f8edf2", color: "#75435c", border: "none", borderRadius: 7, padding: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", textDecoration: "none" };
const emptyStyle = { minHeight: 145, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12, color: "#a58c98", fontSize: 13 };
const productGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 };
const miniProduct = { border: "1px solid #f0e5e9", borderRadius: 9, padding: 15, display: "flex", flexDirection: "column", gap: 10 };
const miniImage = { width: "100%", height: 150, objectFit: "cover", borderRadius: 8 };
const tableImage = { width: 42, height: 48, objectFit: "cover", borderRadius: 6 };
const categoryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 13 };
const categoryCard = { display: "flex", flexDirection: "column", gap: 10, padding: 18, border: "1px solid #f0e5e9", borderRadius: 11 };
const categoryForm = { display: "flex", alignItems: "end", gap: 12, flexWrap: "wrap", marginBottom: 25 };
const searchBox = { display: "flex", alignItems: "center", gap: 10, border: "1px solid #eadde3", borderRadius: 9, padding: "11px 13px", maxWidth: 400, marginBottom: 20 };
const modalOverlay = { position: "fixed", inset: 0, background: "#21131dcc", zIndex: 30, display: "grid", placeItems: "center", padding: 15 };
const modalStyle = { background: "#fff", width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", borderRadius: 15, padding: 25, color: "#542d40", boxSizing: "border-box" };
const formLabel = { display: "block", marginTop: 16 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 };
const checkLabel = { display: "flex", alignItems: "center", gap: 9, marginTop: 16, fontSize: 13 };
const errorBanner = { display: "flex", alignItems: "center", gap: 10, background: "#fff0ef", color: "#a62c36", padding: 13, borderRadius: 9, marginBottom: 16, fontSize: 13 };
const successBanner = { display: "flex", alignItems: "center", gap: 10, background: "#eaf7ef", color: "#28764d", padding: 13, borderRadius: 9, marginBottom: 16, fontSize: 13 };
const dismissButton = { marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: "inherit" };
const footerStyle = { textAlign: "center", padding: 20, color: "#b49ba6", fontSize: 12 };
const logoPreview = { display: "block", maxWidth: 150, maxHeight: 110, objectFit: "contain", marginTop: 12, border: "1px solid #eee", borderRadius: 8, padding: 6 };
const bannerGrid = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, marginBottom: 12 };
const bannerPreview = { width: 150, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" };
const productPreview = { width: 100, height: 120, objectFit: "cover", borderRadius: 8 };
const removeBanner = { position: "absolute", top: 4, right: 4, border: 0, borderRadius: "50%", background: "#fff", color: "#a22", padding: 4, cursor: "pointer" };
const hintStyle = { fontSize: 12, color: "#987b89", marginTop: 6 };
