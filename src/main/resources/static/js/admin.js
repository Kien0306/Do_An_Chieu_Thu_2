const adminState = {
  currentUser: null,
  products: [],
  categories: [],
  roles: [],
  topSelling: [],
};

const adminNotice = document.getElementById("adminNotice");
const adminGate = document.getElementById("adminGate");
const adminContent = document.getElementById("adminContent");
const categoryTable = document.getElementById("categoryTable");
const couponTable = document.getElementById("couponTable");
const dashboardName = document.getElementById("dashboardName");
const salesChart = document.getElementById("salesChart");

async function ensureAdmin() {
  const user = await getCurrentUser();
  adminState.currentUser = user;
  if (!user || user.role?.name !== "ADMIN") {
    adminGate.classList.remove("hidden");
    adminContent.classList.add("hidden");
    throw new Error("Bạn cần đăng nhập tài khoản ADMIN để vào trang quản trị.");
  }
  dashboardName.textContent = user.fullName || user.username;
  adminGate.classList.add("hidden");
  adminContent.classList.remove("hidden");
}

async function loadMasterData() {
  const [products, categories, roles, topSelling] = await Promise.all([
    api.get("/api/v1/products"),
    api.get("/api/v1/categories"),
    api.get("/api/v1/roles"),
    api.get("/api/v1/dashboard/top-selling").catch(() => []),
  ]);
  adminState.products = products;
  adminState.categories = categories;
  adminState.roles = roles.filter((r) => !r.isDeleted);
  adminState.topSelling = topSelling;
  renderStats();
  renderSalesChart();
  renderCategories();
}

function renderStats() {
  document.getElementById("kpiProducts").textContent =
    adminState.products.length;
  document.getElementById("kpiCategories").textContent =
    adminState.categories.length;
}

function renderSalesChart() {
  if (!salesChart) return;
  if (!adminState.topSelling.length) {
    salesChart.className = "sales-chart empty";
    salesChart.textContent = "Chưa có dữ liệu bán hàng để hiển thị.";
    return;
  }
  const maxSold = Math.max(
    ...adminState.topSelling.map((item) => Number(item.soldCount || 0)),
    1,
  );
  salesChart.className = "sales-chart";
  salesChart.innerHTML = adminState.topSelling
    .map((item) => {
      const width = Math.max(
        10,
        Math.round((Number(item.soldCount || 0) / maxSold) * 100),
      );
      return `
      <div class="sales-row">
        <div class="sales-label">
          <strong>${item.title}</strong>
          <span>${item.category}</span>
        </div>
        <div class="sales-bar-wrap"><div class="sales-bar" style="width:${width}%"></div></div>
        <div class="sales-value">${item.soldCount}</div>
      </div>
    `;
    })
    .join("");
}

function renderCategories() {
  categoryTable.innerHTML = adminState.categories
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td>
        <div class="row">
          <a class="btn secondary" href="/categories/edit/${item._id}">Sửa</a>
          <button class="btn danger" onclick="deleteCategory('${item._id}')">Xoá</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

document.getElementById("logoutAdmin").onclick = async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
};

(async function init() {
  try {
    await ensureAdmin();
    await loadMasterData();
    [
      "product.updated",
      "category.updated",
      "coupon.updated",
      "dashboard.updated",
      "order.created",
      "order.updated",
    ].forEach((eventName) =>
      subscribeRealtime(eventName, async () => {
        try {
          await loadMasterData();
        } catch {}
      }),
    );
  } catch (error) {
    showMessage(adminNotice, error.message, true);
  }
})();
