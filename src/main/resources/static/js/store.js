const state = {
  categories: [],
  products: [],
  currentUser: null,
  selectedCategory: "",
  search: "",
  sort: "",
};

const productGrid = document.getElementById("productGrid");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");
const cartList = document.getElementById("cartList");
const cartTotal = document.getElementById("cartTotal");
const userArea = document.getElementById("userArea");
const adminLink = document.getElementById("adminLink");

function renderUserArea() {
  if (!state.currentUser) {
    userArea.innerHTML =
      '<a class="btn secondary" href="#authSection">Đăng nhập</a>';
    adminLink.classList.add("hidden");
    return;
  }
  const roleName = state.currentUser.role?.name || "";
  if (roleName === "ADMIN") adminLink.classList.remove("hidden");
  userArea.innerHTML = `
    <div class="row">
      <div>
        <div><strong>${state.currentUser.fullName || state.currentUser.username}</strong></div>
        <div class="meta">${roleName}</div>
      </div>
      <button class="btn secondary" id="logoutBtn">Đăng xuất</button>
    </div>
  `;
  document.getElementById("logoutBtn").onclick = async () => {
    await api.post("/api/v1/auth/logout", {});
    state.currentUser = null;
    renderUserArea();
    await loadCart();
  };
}

function renderCategories() {
  categoryFilters.innerHTML = `
    <label class="filter-option"><input type="radio" name="category" value="" ${!state.selectedCategory ? "checked" : ""}>Tất cả</label>
    ${state.categories
      .map(
        (item) => `
      <label class="filter-option"><input type="radio" name="category" value="${item._id}" ${state.selectedCategory === item._id ? "checked" : ""}>${item.name}</label>
    `,
      )
      .join("")}
  `;
  categoryFilters
    .querySelectorAll('input[name="category"]')
    .forEach((input) => {
      input.addEventListener("change", async (e) => {
        state.selectedCategory = e.target.value;
        await loadProducts();
      });
    });
}

function renderProducts() {
  if (!state.products.length) {
    productGrid.innerHTML =
      '<div class="panel">Không có sản phẩm phù hợp.</div>';
    return;
  }
  productGrid.innerHTML = state.products
    .map(
      (item) => `
    <div class="product-card">
      <img src="${item.images?.[0] || "https://placehold.co/600x400"}" alt="${item.title}">
      <div class="body">
        <div class="row between"><span class="badge">${item.category?.name || "Khác"}</span><span class="meta">${item.gender || ""}</span></div>
        <h3>${item.title}</h3>
        <div class="meta">${item.description || ""}</div>
        <div class="price">${formatPrice(item.price)}</div>
        <button class="btn primary" onclick="addToCart('${item._id}')">Thêm giỏ hàng</button>
      </div>
    </div>
  `,
    )
    .join("");
}

async function loadCategories() {
  state.categories = await api.get("/api/v1/categories");
  renderCategories();
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (state.search) params.set("title", state.search);
  if (state.selectedCategory) params.set("category", state.selectedCategory);
  if (state.sort) params.set("sort", state.sort);
  state.products = await api.get("/api/v1/products?" + params.toString());
  renderProducts();
}

async function loadCart() {
  try {
    const items = await api.get("/api/v1/carts");
    renderCart(items);
  } catch {
    renderCart([]);
  }
}

function renderCart(items) {
  if (!items.length) {
    cartList.innerHTML = '<div class="meta">Giỏ hàng đang trống.</div>';
    cartTotal.textContent = formatPrice(0);
    return;
  }
  let total = 0;
  cartList.innerHTML = items
    .map((item) => {
      const product = item.product || {};
      const subtotal = Number(product.price || 0) * Number(item.quantity || 0);
      total += subtotal;
      return `
      <div class="cart-item">
        <img src="${product.images?.[0] || "https://placehold.co/200"}" alt="${product.title || ""}">
        <div>
          <strong>${product.title || "San pham"}</strong>
          <div class="meta">${product.category?.name || ""}</div>
          <div>${formatPrice(product.price)} x ${item.quantity}</div>
        </div>
        <div>
          <div style="font-weight:700; margin-bottom:10px">${formatPrice(subtotal)}</div>
          <button class="btn secondary" onclick="decreaseCart('${product._id}')">-1</button>
          <button class="btn danger" onclick="removeCart('${product._id}')">Xoá</button>
        </div>
      </div>
    `;
    })
    .join("");
  cartTotal.textContent = formatPrice(total);
}

async function addToCart(productId) {
  try {
    await api.post("/api/v1/carts/add", {
      product: productId
    });
    await loadCart();
    alert("Đã thêm vào giỏ hàng");
  } catch (error) {
    alert(error.message);
    location.hash = "#authSection";
  }
}

async function decreaseCart(productId) {
  await api.post("/api/v1/carts/decrease", {
    product: productId
  });
  await loadCart();
}

async function removeCart(productId) {
  await api.post("/api/v1/carts/remove", {
    product: productId
  });
  await loadCart();
}
window.addToCart = addToCart;
window.decreaseCart = decreaseCart;
window.removeCart = removeCart;

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage(authMessage);
  try {
    const form = new FormData(loginForm);
    const body = Object.fromEntries(form.entries());
    const result = await api.post("/api/v1/auth/login", body);
    state.currentUser = result.user;
    renderUserArea();
    await loadCart();
    showMessage(authMessage, "Đăng nhập thành công");
    loginForm.reset();
  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage(authMessage);
  try {
    const form = new FormData(registerForm);
    const body = Object.fromEntries(form.entries());
    await api.post("/api/v1/auth/register", body);
    showMessage(authMessage, "Đăng ký thành công, mời bạn đăng nhập");
    registerForm.reset();
  } catch (error) {
    showMessage(authMessage, error.message, true);
  }
});

searchInput.addEventListener("input", async (e) => {
  state.search = e.target.value.trim();
  await loadProducts();
});
sortSelect.addEventListener("change", async (e) => {
  state.sort = e.target.value;
  await loadProducts();
});

(async function init() {
  state.currentUser = await getCurrentUser();
  renderUserArea();
  await loadCategories();
  await loadProducts();
  await loadCart();
})();
