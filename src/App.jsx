
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import CustomerStore from "./CustomerStore";
import {
  LayoutDashboard, ShoppingBag, Package, Tags, Truck,
  LogOut, Plus, Search, Pencil, Trash2, RefreshCw,
  Menu, X, Eye, IndianRupee, Users, ClipboardList,
  Lock, AlertCircle, CheckCircle, ExternalLink
} from "lucide-react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const dateFormat = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #e5d5dc",
  borderRadius: "9px",
  fontSize: "14px",
  marginTop: "6px",
  outlineColor: "#a54d70"
};

const buttonStyle = {
  border: "none",
  borderRadius: "9px",
  padding: "11px 15px",
  cursor: "pointer",
  fontWeight: 600
};

export default function App() {
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

  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [parcelSlips, setParcelSlips] = useState([]);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [productForm, setProductForm] = useState({
  name: "",
  description: "",
  price: "",
  original_price: "",
  sku: "",
  category_id: "",
  sizes: [],
  is_available: true,
  is_active: true
});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadAllData();
  }, [session]);

  async function loadAllData() {
    setDataLoading(true);
    setError("");

    const results = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("parcel_slips").select("*").order("created_at", { ascending: false })
    ]);

    const [p, c, o, s] = results;

    if (p.error) setError("Products: " + p.error.message);
    else setProducts(p.data || []);

    if (c.error) console.error("Categories:", c.error.message);
    else setCategories(c.data || []);

    if (o.error) console.error("Orders:", o.error.message);
    else setOrders(o.data || []);

    if (s.error) console.error("Parcel slips:", s.error.message);
    else setParcelSlips(s.data || []);

    setDataLoading(false);
  }

  function startEditCategory(category) {
  setEditingCategory(category);
  setCategoryName(category.name || category.title || "");
  setError("");
  setSuccess("");
}

function cancelEditCategory() {
  setEditingCategory(null);
  setCategoryName("");
}

async function saveCategory(event) {
  event.preventDefault();

  const name = categoryName.trim();

  if (!name) {
    setError("Please enter a category name.");
    return;
  }

  setSavingCategory(true);
  setError("");
  setSuccess("");

  const result = editingCategory
    ? await supabase
        .from("categories")
        .update({ name })
        .eq("id", editingCategory.id)
    : await supabase
        .from("categories")
        .insert({ name });

  if (result.error) {
    setError("Could not save category: " + result.error.message);
  } else {
    setSuccess(editingCategory ? "Category renamed!" : "Category added!");
    cancelEditCategory();
    await loadAllData();
  }

  setSavingCategory(false);
}

async function deleteCategory(category) {
  const categoryLabel = category.name || category.title || "this category";

  const { data: linkedProducts, error: checkError } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", category.id)
    .limit(1);

  if (checkError) {
    setError("Could not check category products: " + checkError.message);
    return;
  }

  if (linkedProducts && linkedProducts.length > 0) {
    setError(
      `Cannot delete "${categoryLabel}" because products are assigned to it. Change those products' categories first.`
    );
    return;
  }

  if (!window.confirm(`Delete category "${categoryLabel}"?`)) return;

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", category.id);

  if (deleteError) {
    setError("Could not delete category: " + deleteError.message);
  } else {
    setSuccess("Category deleted.");
    await loadAllData();
  }
}
  
  async function login(event) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setLoginError(error.message);
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setProducts([]);
    setOrders([]);
    setParcelSlips([]);
  }

  function openNewProduct() {
  setEditingProduct(null);
  setProductForm({
    name: "",
    description: "",
    price: "",
    original_price: "",
    sku: "",
    category_id: "",
    sizes: [],
    is_available: true,
    is_active: true
  });
  setImageFile(null);
  setImagePreview("");
  setShowProductForm(true);
}

  function openEditProduct(product) {
  setEditingProduct(product);
  setProductForm({
    name: product.name || "",
    description: product.description || "",
    price: product.price ?? "",
    original_price: product.original_price ?? "",
    sku: product.sku || "",
    category_id: product.category_id || "",
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    is_available: product.is_available ?? true,
    is_active: product.is_active ?? true
  });
  setImageFile(null);
  setImagePreview(product.image_url || "");
  setShowProductForm(true);
}
  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    // Keep the existing image unless a new image is uploaded
let imageUrl = editingProduct?.image_url || null;

if (imageFile) {
  const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";

  const filePath =
    `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: imageFile.type
    });

  if (uploadError) {
    setError("Image upload failed: " + uploadError.message);
    setSaving(false);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  imageUrl = publicUrlData.publicUrl;
}
    const payload = {
  name: productForm.name.trim(),
  description: productForm.description.trim(),
  price: Number(productForm.price),
  image_url: imageUrl,
  original_price: productForm.original_price
    ? Number(productForm.original_price)
    : null,
  sku: productForm.sku.trim() || null,
  category_id: productForm.category_id || null,
  sizes: productForm.sizes,
  is_available: productForm.is_available,
  is_active: productForm.is_active
};

    if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0) {
      setError("Enter a valid product name and price.");
      setSaving(false);
      return;
    }

    const result = editingProduct
      ? await supabase.from("products").update(payload).eq("id", editingProduct.id)
      : await supabase.from("products").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(editingProduct ? "Product updated!" : "Product added!");
      setShowProductForm(false);
      await loadAllData();
    }

    setSaving(false);
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) setError(error.message);
    else {
      setSuccess("Product deleted.");
      await loadAllData();
    }
  }

  async function deleteParcelRecord(slip) {
    if (!window.confirm(
      "Delete this parcel slip database record? The actual stored file will not be deleted."
    )) return;

    const { error } = await supabase
      .from("parcel_slips")
      .delete()
      .eq("id", slip.id);

    if (error) setError(error.message);
    else {
      setSuccess("Parcel slip record deleted.");
      await loadAllData();
    }
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: ShoppingBag },
    { id: "categories", label: "Categories", icon: Tags },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "parcels", label: "Parcel Slips", icon: Truck }
  ];

  const filteredProducts = products.filter((p) =>
    `${p.name || ""} ${p.sku || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

    // Public customer shopping website
  if (window.location.pathname === "/shop") {
    return <CustomerStore />;
  }
  
  if (loading) {
    return <div style={centerStyle}>Loading Muddugumma Clothing...</div>;
  }

  if (!session) {
    return (
      <div style={loginBackground}>
        <form onSubmit={login} style={loginCard}>
          <div style={brandIcon}>M</div>
          <h1 style={{ color: "#542d40", marginBottom: 5 }}>
            Muddugumma
          </h1>
          <p style={{ color: "#967482", marginBottom: 28 }}>
            Clothing · Owner Dashboard
          </p>

          <h2 style={{ fontSize: 21, marginBottom: 20 }}>Owner Login</h2>

          <label>Email address</label>
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <label style={{ display: "block", marginTop: 17 }}>
            Password
          </label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          {loginError && <p style={errorStyle}>{loginError}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...primaryButton, width: "100%", marginTop: 22 }}
          >
            <Lock size={17} /> Sign in
          </button>

          <p style={{ fontSize: 12, color: "#987e89", marginTop: 20 }}>
            Secure sign-in powered by Supabase
          </p>
        </form>
      </div>
    );
  }

  return (
    <div style={appStyle}>
      <aside style={{
        ...sidebarStyle,
        display: mobileMenu ? "flex" : undefined
      }}>
        <div style={logoArea}>
          <div style={smallLogo}>M</div>
          <div>
            <b>Muddugumma</b>
            <small style={{ display: "block", color: "#d6b8c5" }}>
              CLOTHING
            </small>
          </div>
          <button
            style={mobileClose}
            onClick={() => setMobileMenu(false)}
          >
            <X />
          </button>
        </div>

        <p style={sideHeading}>MAIN MENU</p>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setMobileMenu(false);
                setSearch("");
                setError("");
                setSuccess("");
              }}
              style={{
                ...navButton,
                background: page === item.id ? "#75435c" : "transparent",
                color: page === item.id ? "#fff" : "#dbcbd2"
              }}
            >
              <Icon size={19} />
              {item.label}
              {item.id === "orders" && orders.length > 0 && (
                <span style={navCount}>{orders.length}</span>
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <div style={ownerBox}>
          <div style={avatar}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>Owner</b>
            <small style={{
              display: "block",
              color: "#c9aeb9",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {session.user.email}
            </small>
          </div>
          <button onClick={logout} title="Logout" style={logoutButton}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main style={mainStyle}>
        <header style={topbar}>
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            style={menuButton}
          >
            <Menu />
          </button>

          <div>
            <b style={{ color: "#542d40" }}>Muddugumma Clothing</b>
            <span style={topSubtitle}> / Owner Panel</span>
          </div>

          <button onClick={loadAllData} style={refreshButton}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </header>

        <section style={contentStyle}>
          <div style={pageHeader}>
            <div>
              <h1 style={{ color: "#482b39", fontSize: 25 }}>
                {navItems.find((n) => n.id === page)?.label}
              </h1>
              <p style={{ color: "#987b89", marginTop: 7 }}>
                Welcome to your clothing business dashboard.
              </p>
            </div>
          </div>

          {error && (
            <div style={errorBanner}>
              <AlertCircle size={18} />
              {error}
              <button onClick={() => setError("")} style={dismissButton}>
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div style={successBanner}>
              <CheckCircle size={18} />
              {success}
              <button onClick={() => setSuccess("")} style={dismissButton}>
                <X size={16} />
              </button>
            </div>
          )}

          {dataLoading && (
            <p style={{ color: "#967482", marginBottom: 15 }}>
              Loading your business data...
            </p>
          )}

          {page === "dashboard" && (
            <>
              <div style={statsGrid}>
                <StatCard
                  icon={<IndianRupee />}
                  title="Total Products"
                  value={products.length}
                  color="#a44d70"
                />
                <StatCard
                  icon={<ClipboardList />}
                  title="Total Orders"
                  value={orders.length}
                  color="#547ca8"
                />
                <StatCard
                  icon={<Tags />}
                  title="Categories"
                  value={categories.length}
                  color="#8b70a8"
                />
                <StatCard
                  icon={<Truck />}
                  title="Parcel Slips"
                  value={parcelSlips.length}
                  color="#59927c"
                />
              </div>

              <div style={panelStyle}>
                <div style={panelHeader}>
                  <h3>Recent Orders</h3>
                  <button
                    onClick={() => setPage("orders")}
                    style={textButton}
                  >
                    View all
                  </button>
                </div>

                {orders.length === 0 ? (
                  <EmptyState text="No orders found yet." />
                ) : (
                  <div style={tableScroll}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td>{dateFormat(order.created_at)}</td>
                            <td>
                              {order.customer_name ||
                                order.name ||
                                order.customer_email ||
                                "Customer"}
                            </td>
                            <td>{money(order.total_amount || order.total)}</td>
                            <td>
                              <Status value={order.status || "Pending"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={panelStyle}>
                <div style={panelHeader}>
                  <h3>Recently Added Products</h3>
                  <button
                    onClick={() => setPage("products")}
                    style={textButton}
                  >
                    View products
                  </button>
                </div>
                {products.length === 0 ? (
                  <EmptyState text="Add your first clothing product." />
                ) : (
                  <div style={productGrid}>
                    {products.slice(0, 4).map((product) => (
                      <div key={product.id} style={miniProduct}>
                        <b>{product.name}</b>
                        <strong style={{ color: "#a44d70" }}>
                          {money(product.price)}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {page === "products" && (
            <div style={panelStyle}>
              <div style={panelHeader}>
                <h3>Manage Products ({products.length})</h3>
                <button onClick={openNewProduct} style={primaryButton}>
                  <Plus size={17} /> Add Product
                </button>
              </div>

              <SearchBar value={search} onChange={setSearch} />

              {filteredProducts.length === 0 ? (
                <EmptyState text="No products found. Add your first product." />
              ) : (
                <div style={tableScroll}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Availability</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <b>{product.name}</b>
                            <small style={mutedCell}>
                              {product.description || ""}
                            </small>
                          </td>
                          <td>{product.sku || "—"}</td>
                          <td>{money(product.price)}</td>
                          <td>
                            <Status value={
                              product.is_available ? "Available" : "Unavailable"
                            } />
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 7 }}>
                              <button
                                style={iconButton}
                                onClick={() => openEditProduct(product)}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                style={{ ...iconButton, color: "#c34d58" }}
                                onClick={() => deleteProduct(product)}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {page === "categories" && (
  <div style={panelStyle}>
    <h3 style={{ marginBottom: 20 }}>
      Manage Categories ({categories.length})
    </h3>

    <form
      onSubmit={saveCategory}
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 25
      }}
    >
      <input
        style={{ ...inputStyle, flex: "1 1 220px", marginTop: 0 }}
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
        placeholder="Enter category name"
        required
      />

      <button type="submit" disabled={savingCategory} style={primaryButton}>
        {savingCategory
          ? "Saving..."
          : editingCategory
          ? "Update Category"
          : "Add Category"}
      </button>

      {editingCategory && (
        <button
          type="button"
          onClick={cancelEditCategory}
          style={secondaryButton}
        >
          Cancel
        </button>
      )}
    </form>

    {categories.length === 0 ? (
      <EmptyState text="No categories yet. Add your first category above." />
    ) : (
      <div style={categoryGrid}>
        {categories.map((category) => (
          <div key={category.id} style={categoryCard}>
            <Tags color="#a44d70" />
            <b>{category.name || category.title || "Category"}</b>
            <small style={{ color: "#987b89" }}>Clothing category</small>

            <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
              <button
                type="button"
                style={iconButton}
                onClick={() => startEditCategory(category)}
                title="Rename category"
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                style={{ ...iconButton, color: "#c34d58" }}
                onClick={() => deleteCategory(category)}
                title="Delete category"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

          {page === "orders" && (
            <div style={panelStyle}>
              <div style={panelHeader}>
                <h3>Customer Orders ({orders.length})</h3>
              </div>

              {orders.length === 0 ? (
                <EmptyState text="No customer orders available yet." />
              ) : (
                <div style={tableScroll}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{dateFormat(order.created_at)}</td>
                          <td>
                            {order.customer_name ||
                              order.name ||
                              order.customer_email ||
                              "Customer"}
                            <small style={mutedCell}>
                              {order.phone || order.customer_phone || ""}
                            </small>
                          </td>
                          <td>{money(order.total_amount || order.total)}</td>
                          <td><Status value={order.status || "Pending"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {page === "parcels" && (
            <div style={panelStyle}>
              <div style={panelHeader}>
                <h3>Parcel Slip Records ({parcelSlips.length})</h3>
              </div>

              <p style={{
                color: "#987b89",
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.6
              }}>
                Parcel slips are listed by their saved date. OneDrive upload,
                file management and printing integration will be added in
                the next stage.
              </p>

              {parcelSlips.length === 0 ? (
                <EmptyState text="No parcel slip records found." />
              ) : (
                <div style={tableScroll}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order ID</th>
                        <th>File Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelSlips.map((slip) => (
                        <tr key={slip.id}>
                          <td>{dateFormat(slip.parcel_date || slip.created_at)}</td>
                          <td>{slip.order_id || "—"}</td>
                          <td>{slip.file_name || "Parcel slip"}</td>
                          <td>
                            <div style={{ display: "flex", gap: 7 }}>
                              {slip.file_url && (
                                <a
                                  href={slip.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={iconButton}
                                  title="Open file"
                                >
                                  <ExternalLink size={16} />
                                </a>
                              )}
                              <button
                                onClick={() => deleteParcelRecord(slip)}
                                style={{ ...iconButton, color: "#c34d58" }}
                                title="Delete record"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <footer style={footerStyle}>
            © {new Date().getFullYear()} Muddugumma Clothing · Owner Dashboard
          </footer>
        </section>
      </main>

      {showProductForm && (
        <div style={modalOverlay}>
          <form onSubmit={saveProduct} style={modalStyle}>
            <div style={panelHeader}>
              <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                style={iconButton}
              >
                <X />
              </button>
            </div>

            <label>Product Name *</label>
            <input
              style={inputStyle}
              value={productForm.name}
              onChange={(e) => setProductForm({
                ...productForm, name: e.target.value
              })}
              placeholder="Enter product name"
              required
            />

            <label style={formLabel}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 85, resize: "vertical" }}
              value={productForm.description}
              onChange={(e) => setProductForm({
                ...productForm, description: e.target.value
              })}
              placeholder="Describe your product"
            />
            <label style={formLabel}>Product Photo</label>

<input
  type="file"
  accept="image/*"
  style={inputStyle}
  onChange={(e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }}
/>

{imagePreview && (
  <div style={{ marginTop: 15 }}>
    <p style={{ fontSize: 13, marginBottom: 8 }}>
      Product photo preview:
    </p>

    <img
      src={imagePreview}
      alt="Product preview"
      style={{
        width: 160,
        height: 180,
        objectFit: "cover",
        borderRadius: 10,
        border: "1px solid #eadde3"
      }}
    />
  </div>
)}

<p style={{ fontSize: 12, color: "#987b89" }}>
  Select JPG, PNG or WEBP. Maximum size: 5 MB.
</p>

            <div style={formGrid}>
              <div>
                <label>Price (₹) *</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({
                    ...productForm, price: e.target.value
                  })}
                  required
                />
              </div>
              <div>
                <label>Original Price (₹)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.original_price}
                  onChange={(e) => setProductForm({
                    ...productForm, original_price: e.target.value
                  })}
                />
              </div>
            </div>

            <label style={formLabel}>SKU</label>
            <input
              style={inputStyle}
              value={productForm.sku}
              onChange={(e) => setProductForm({
                ...productForm, sku: e.target.value
              })}
              placeholder="Product code"
            />

            <label style={formLabel}>Category</label>
<select
  style={inputStyle}
  value={productForm.category_id}
  onChange={(e) => setProductForm({
    ...productForm, category_id: e.target.value
  })}
>
  <option value="">Select category</option>
  {categories.map((category) => (
    <option key={category.id} value={category.id}>
      {category.name || category.title}
    </option>
  ))}
</select>

<label style={formLabel}>Available Sizes</label>

<div style={{
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 10
}}>
  {["XS", "S", "M", "L", "XL", "XXL", "Free Size"].map((size) => (
    <label
      key={size}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 12px",
        border: "1px solid #e5d5dc",
        borderRadius: 8,
        background: productForm.sizes.includes(size) ? "#f8edf2" : "#fff",
        cursor: "pointer",
        fontSize: 13
      }}
    >
      <input
        type="checkbox"
        checked={productForm.sizes.includes(size)}
        onChange={(e) => {
          const updatedSizes = e.target.checked
            ? [...productForm.sizes, size]
            : productForm.sizes.filter((item) => item !== size);

          setProductForm({
            ...productForm,
            sizes: updatedSizes
          });
        }}
      />
      {size}
    </label>
  ))}
</div>

            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={productForm.is_available}
                onChange={(e) => setProductForm({
                  ...productForm, is_available: e.target.checked
                })}
              />
              Product available for sale
            </label>

            <label style={checkLabel}>
              <input
                type="checkbox"
                checked={productForm.is_active}
                onChange={(e) => setProductForm({
                  ...productForm, is_active: e.target.checked
                })}
              />
              Product active
            </label>

            {error && <p style={errorStyle}>{error}</p>}

            <div style={{
              display: "flex",
              gap: 10,
              marginTop: 25,
              justifyContent: "flex-end"
            }}>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => setShowProductForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={primaryButton}
              >
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div style={statCard}>
      <div style={{
        ...statIcon,
        background: color + "18",
        color
      }}>
        {icon}
      </div>
      <div>
        <p style={{ color: "#987b89", fontSize: 13 }}>{title}</p>
        <h2 style={{ color: "#482b39", marginTop: 6 }}>{value}</h2>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <div style={searchBox}>
      <Search size={18} color="#987b89" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search products..."
        style={{
          border: "none",
          outline: "none",
          width: "100%",
          background: "transparent"
        }}
      />
    </div>
  );
}

function Status({ value }) {
  const text = String(value);
  const positive = ["delivered", "completed", "available", "active", "paid"];
  const isPositive = positive.includes(text.toLowerCase());

  return (
    <span style={{
      background: isPositive ? "#e5f5ed" : "#fff2df",
      color: isPositive ? "#28764d" : "#a36b25",
      borderRadius: 20,
      padding: "5px 10px",
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap"
    }}>
      {text}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={emptyStyle}>
      <Package size={32} color="#c6a7b5" />
      <p>{text}</p>
    </div>
  );
}

const centerStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  color: "#75435c",
  background: "#fffaf7",
  fontSize: 18
};

const loginBackground = {
  minHeight: "100vh",
  background: "linear-gradient(135deg,#f9eaf0,#fffaf7,#f3e2e9)",
  display: "grid",
  placeItems: "center",
  padding: 20
};

const loginCard = {
  width: "100%",
  maxWidth: 410,
  background: "#fff",
  borderRadius: 20,
  padding: 35,
  boxShadow: "0 15px 55px #75435c18",
  color: "#542d40"
};

const brandIcon = {
  width: 55,
  height: 55,
  background: "#75435c",
  color: "#fff",
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  fontSize: 27,
  fontWeight: 800,
  marginBottom: 20
};

const primaryButton = {
  ...buttonStyle,
  background: "#75435c",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8
};

const secondaryButton = {
  ...buttonStyle,
  background: "#f5eaf0",
  color: "#75435c"
};

const errorStyle = {
  color: "#b42335",
  fontSize: 13,
  marginTop: 12
};

const appStyle = {
  minHeight: "100vh",
  display: "flex",
  background: "#fffaf8",
  fontFamily: "Arial, sans-serif",
  color: "#49313c"
};

const sidebarStyle = {
  width: 255,
  minWidth: 255,
  background: "#402735",
  minHeight: "100vh",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  position: "sticky",
  top: 0,
  height: "100vh",
  zIndex: 10
};

const logoArea = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "#fff",
  padding: "8px 0 28px"
};

const smallLogo = {
  width: 40,
  height: 40,
  background: "#a65b7c",
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  fontSize: 21
};

const sideHeading = {
  color: "#bda3b0",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.4,
  margin: "10px 0 13px"
};

const navButton = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  border: "none",
  borderRadius: 9,
  padding: "13px 12px",
  width: "100%",
  textAlign: "left",
  marginBottom: 5,
  cursor: "pointer",
  fontSize: 14
};

const navCount = {
  marginLeft: "auto",
  background: "#a65b7c",
  borderRadius: 15,
  padding: "3px 8px",
  fontSize: 11
};

const ownerBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingTop: 18,
  borderTop: "1px solid #624655",
  color: "#fff",
  fontSize: 13
};

const avatar = {
  background: "#a65b7c",
  width: 35,
  height: 35,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  fontWeight: 700
};

const logoutButton = {
  background: "transparent",
  color: "#e6d5dd",
  border: "none",
  cursor: "pointer",
  padding: 8
};

const mainStyle = {
  flex: 1,
  minWidth: 0
};

const topbar = {
  height: 72,
  background: "#fff",
  borderBottom: "1px solid #f0e5e9",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "0 28px",
  position: "sticky",
  top: 0,
  zIndex: 5
};

const topSubtitle = {
  color: "#b49ba6",
  fontSize: 13
};

const refreshButton = {
  ...buttonStyle,
  display: "flex",
  alignItems: "center",
  gap: 7,
  color: "#75435c",
  background: "#f8edf2"
};

const menuButton = {
  display: "none",
  border: "none",
  background: "transparent",
  color: "#75435c",
  cursor: "pointer"
};

const mobileClose = {
  display: "none",
  marginLeft: "auto",
  color: "#fff",
  border: "none",
  background: "transparent"
};

const contentStyle = {
  maxWidth: 1500,
  margin: "0 auto",
  padding: 28
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 25
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 17,
  marginBottom: 23
};

const statCard = {
  background: "#fff",
  padding: 22,
  borderRadius: 13,
  border: "1px solid #f0e5e9",
  display: "flex",
  alignItems: "center",
  gap: 16
};

const statIcon = {
  width: 47,
  height: 47,
  borderRadius: 12,
  display: "grid",
  placeItems: "center"
};

const panelStyle = {
  background: "#fff",
  border: "1px solid #f0e5e9",
  borderRadius: 13,
  padding: 21,
  marginBottom: 22,
  minWidth: 0
};

const panelHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 20
};

const textButton = {
  border: "none",
  background: "transparent",
  color: "#a44d70",
  cursor: "pointer",
  fontWeight: 700
};

const tableScroll = {
  overflowX: "auto",
  width: "100%"
};

const tableStyle = {
  borderCollapse: "collapse",
  width: "100%",
  textAlign: "left",
  fontSize: 13,
  minWidth: 650
};

const mutedCell = {
  display: "block",
  color: "#a58c98",
  fontSize: 11,
  marginTop: 5
};

const iconButton = {
  background: "#f8edf2",
  color: "#75435c",
  border: "none",
  borderRadius: 7,
  padding: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  textDecoration: "none"
};

const emptyStyle = {
  minHeight: 145,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
  color: "#a58c98",
  fontSize: 13
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 12
};

const miniProduct = {
  border: "1px solid #f0e5e9",
  borderRadius: 9,
  padding: 15,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const categoryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
  gap: 13
};

const categoryCard = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 18,
  border: "1px solid #f0e5e9",
  borderRadius: 11
};

const searchBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid #eadde3",
  borderRadius: 9,
  padding: "11px 13px",
  maxWidth: 400,
  marginBottom: 20
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "#21131dcc",
  zIndex: 30,
  display: "grid",
  placeItems: "center",
  padding: 15
};

const modalStyle = {
  background: "#fff",
  width: "100%",
  maxWidth: 570,
  maxHeight: "92vh",
  overflowY: "auto",
  borderRadius: 15,
  padding: 25,
  color: "#542d40"
};

const formLabel = {
  display: "block",
  marginTop: 16
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginTop: 16
};

const checkLabel = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  marginTop: 16,
  fontSize: 13
};

const errorBanner = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#fff0ef",
  color: "#a62c36",
  padding: 13,
  borderRadius: 9,
  marginBottom: 16,
  fontSize: 13
};

const successBanner = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#eaf7ef",
  color: "#28764d",
  padding: 13,
  borderRadius: 9,
  marginBottom: 16,
  fontSize: 13
};

const dismissButton = {
  marginLeft: "auto",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "inherit"
};

const footerStyle = {
  textAlign: "center",
  padding: 20,
  color: "#b49ba6",
  fontSize: 12
};
