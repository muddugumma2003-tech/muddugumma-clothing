
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export default function CustomerStore() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStore() {
      setLoading(true);
      setError("");

      const [productResult, categoryResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("is_available", true)
          .order("created_at", { ascending: false }),

        supabase
          .from("categories")
          .select("*")
      ]);

      if (productResult.error) {
        setError(productResult.error.message);
      } else {
        setProducts(productResult.data || []);
      }

      if (categoryResult.error) {
        setError(categoryResult.error.message);
      } else {
        setCategories(categoryResult.data || []);
      }

      setLoading(false);
    }

    loadStore();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" ||
      String(product.category_id) === String(selectedCategory);

    const matchesSearch = product.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function addToCart(product) {
    setCart((previous) => {
      const existing = previous.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return previous.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, { ...product, quantity: 1 }];
    });
  }

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fffaf7",
      color: "#542d40",
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{
        background: "#492838",
        color: "white",
        padding: "20px",
        textAlign: "center"
      }}>
        <h1 style={{ margin: 0, letterSpacing: 2 }}>
          MUDDUGUMMA
        </h1>
        <p style={{ margin: "5px 0", color: "#ead5b0" }}>
          CLOTHING · Tradition Meets Elegance
        </p>
        <div style={{ marginTop: 15 }}>
          <span>Home　 |　 Shop　 |　 Contact</span>
          <span style={{ marginLeft: 20 }}>
            🛍️ Cart ({cartCount})
          </span>
        </div>
      </header>

      <section style={{
        padding: "65px 20px",
        textAlign: "center",
        background: "linear-gradient(120deg, #f5e4df, #fff5e5)"
      }}>
        <p style={{ color: "#987044", letterSpacing: 3 }}>
          THE BEAUTY OF INDIAN TRADITION
        </p>
        <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)" }}>
          Discover Your Elegance
        </h2>
        <p>Beautiful collections for every special occasion.</p>
        <button
          onClick={() =>
            document.getElementById("shop").scrollIntoView({
              behavior: "smooth"
            })
          }
          style={{
            background: "#75435c",
            color: "white",
            border: 0,
            padding: "14px 30px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          SHOP NOW
        </button>
      </section>

      <main id="shop" style={{
        maxWidth: 1200,
        margin: "auto",
        padding: "35px 20px"
      }}>
        <h2 style={{ textAlign: "center" }}>
          Shop Our Collections
        </h2>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          margin: "25px 0"
        }}>
          <button
            onClick={() => setSelectedCategory("all")}
            style={categoryButton(selectedCategory === "all")}
          >
            All Products
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={categoryButton(
                String(selectedCategory) === String(category.id)
              )}
            >
              {category.name || category.title}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for sarees, dresses, kurtis..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 14,
            border: "1px solid #e5d5dc",
            borderRadius: 8,
            marginBottom: 25
          }}
        />

        {loading && <p>Loading collections...</p>}

        {error && (
          <p style={{ color: "red" }}>
            Unable to load products: {error}
          </p>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <p style={{ textAlign: "center", padding: 40 }}>
            No products available yet. Please visit us again!
          </p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 22
        }}>
          {filteredProducts.map((product) => {
            const image =
              product.image_url ||
              product.image ||
              product.thumbnail_url;

            return (
              <article key={product.id} style={{
                background: "white",
                border: "1px solid #f0e2e5",
                borderRadius: 12,
                overflow: "hidden"
              }}>
                <div style={{
                  height: 240,
                  background: "#f5e9e7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {image ? (
                    <img
                      src={image}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    <span style={{ color: "#987b89" }}>
                      Product Image
                    </span>
                  )}
                </div>

                <div style={{ padding: 15 }}>
                  <h3>{product.name}</h3>
                  <p style={{ color: "#987b89", fontSize: 13 }}>
                    {product.description}
                  </p>

                  <strong style={{ color: "#75435c" }}>
                    {money(product.price)}
                  </strong>

                  {product.original_price > product.price && (
                    <del style={{
                      marginLeft: 8,
                      color: "#999"
                    }}>
                      {money(product.original_price)}
                    </del>
                  )}

                  <button
                    onClick={() => addToCart(product)}
                    style={{
                      width: "100%",
                      marginTop: 15,
                      padding: 12,
                      background: "#75435c",
                      color: "white",
                      border: 0,
                      borderRadius: 6,
                      cursor: "pointer"
                    }}
                  >
                    ADD TO CART
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      <footer style={{
        background: "#492838",
        color: "white",
        textAlign: "center",
        padding: 25
      }}>
        <h3>Muddugumma Clothing</h3>
        <p>Thank you for shopping with us ❤️</p>
      </footer>
    </div>
  );
}

function categoryButton(active) {
  return {
    padding: "10px 17px",
    borderRadius: 20,
    border: "1px solid #75435c",
    background: active ? "#75435c" : "white",
    color: active ? "white" : "#75435c",
    cursor: "pointer"
  };
}
