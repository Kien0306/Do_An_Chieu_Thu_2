const inventoryNotice = document.getElementById("inventoryNotice");
const inventoryGate = document.getElementById("inventoryGate");
const inventoryContent = document.getElementById("inventoryContent");
const inventoryTable = document.getElementById("inventoryTable");
const movementTable = document.getElementById("movementTable");
const inventoryAdminName = document.getElementById("inventoryAdminName");
const INVENTORY_SCROLL_KEY = "inventory-scroll-top";
const inventoryQtyDrafts = {};
async function ensureInventoryAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    inventoryGate.classList.remove("hidden");
    inventoryContent.classList.add("hidden");
    throw new Error("Bạn cần đăng nhập ADMIN để vào trang quản lý kho.");
  }
  inventoryAdminName.textContent = user.fullName || user.username;
  inventoryGate.classList.add("hidden");
  inventoryContent.classList.remove("hidden");
}

function renderInventoryRows(items) {
  if (!items.length) {
    inventoryTable.innerHTML =
      '<tr><td colspan="5" class="meta">Chưa có dữ liệu kho.</td></tr>';
    return;
  }
  inventoryTable.innerHTML = items
    .map(
      (item) =>
      `<tr data-product-id="${item.productId}"><td><strong>${item.title}</strong></td><td>${item.category}</td><td class="center-cell"><strong>${item.stock}</strong></td><td class="center-cell">${item.soldCount}</td><td>${(item.sizeStocks || []).length ? `<div class="inventory-size-list">${item.sizeStocks.map((s) => `<div class="inventory-size-row"><span class="inventory-size-label"><span class="inventory-size-name">${s.size}</span><span class="inventory-size-stock">${s.stock}</span></span><input class="inventory-qty" type="number" min="1" value="1" id="qty-${item.productId}-${s.size}"><button class="btn success" onclick="adjustInventory('${item.productId}','${s.size}','in')">Nhập</button><button class="btn secondary" onclick="adjustInventory('${item.productId}','${s.size}','out')">Xuất</button></div>`).join("")}</div>` : `<div class="inventory-actions"><input class="inventory-qty" type="number" min="1" value="1" id="qty-${item.productId}"><button class="btn success" onclick="adjustInventory('${item.productId}','','in')">Nhập</button><button class="btn secondary" onclick="adjustInventory('${item.productId}','','out')">Xuất</button></div>`}</td></tr>`,
    )
    .join("");
}

function renderMovementRows(items) {
  if (!items.length) {
    movementTable.innerHTML =
      '<tr><td colspan="7" class="meta">Chưa có lịch sử nhập xuất.</td></tr>';
    return;
  }
  movementTable.innerHTML = items
    .map(
      (item) =>
      `<tr><td>${new Date(item.createdAt).toLocaleString("vi-VN")}</td><td>${item.productTitle}</td><td>${item.size || "-"}</td><td>${item.type === "in" ? "Nhập kho" : "Xuất kho"}</td><td class="center-cell">${item.quantity}</td><td class="center-cell">${item.stockBefore}</td><td class="center-cell">${item.stockAfter}</td></tr>`,
    )
    .join("");
}

function captureInventoryQtyDrafts() {
  document.querySelectorAll(".inventory-qty").forEach((input) => {
    if (input.id) {
      inventoryQtyDrafts[input.id] = input.value || "1";
    }
  });
}

function restoreInventoryQtyDrafts() {
  document.querySelectorAll(".inventory-qty").forEach((input) => {
    if (!input.id) return;
    if (inventoryQtyDrafts[input.id] !== undefined) {
      input.value = inventoryQtyDrafts[input.id];
    }
    input.addEventListener("input", () => {
      inventoryQtyDrafts[input.id] = input.value || "1";
    });
  });
}

function saveInventoryScroll() {
  sessionStorage.setItem(
    INVENTORY_SCROLL_KEY,
    String(window.scrollY || window.pageYOffset || 0),
  );
}

function restoreInventoryScroll() {
  const raw = sessionStorage.getItem(INVENTORY_SCROLL_KEY);
  if (raw === null) return;
  const top = Number(raw || 0);
  sessionStorage.removeItem(INVENTORY_SCROLL_KEY);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => window.scrollTo(0, top)),
  );
}
async function loadInventoryPage() {
  captureInventoryQtyDrafts();
  const [items, movements] = await Promise.all([
    api.get("/api/v1/inventories"),
    api.get("/api/v1/inventories/movements").catch(() => []),
  ]);
  renderInventoryRows(items);
  renderMovementRows(movements);
  restoreInventoryQtyDrafts();
  restoreInventoryScroll();
}
window.adjustInventory = async (productId, size, type) => {
  const qtyEl = document.getElementById(
    size ? `qty-${productId}-${size}` : `qty-${productId}`,
  );
  const quantity = Number(qtyEl?.value || 0);
  const previousValue = qtyEl?.value || "1";
  try {
    if (!quantity || quantity < 1) throw new Error("Nhập số lượng hợp lệ");
    captureInventoryQtyDrafts();
    if (qtyEl?.id) {
      inventoryQtyDrafts[qtyEl.id] = "1";
    }
    if (qtyEl) {
      qtyEl.value = "1";
    }
    saveInventoryScroll();
    await api.post(
      `/api/v1/inventories/${productId}/${type === "in" ? "inbound" : "outbound"}`, {
        quantity,
        size
      },
    );
    showMessage(inventoryNotice, type === "in" ? "Đã nhập kho" : "Đã xuất kho");
    await loadInventoryPage();
  } catch (error) {
    if (qtyEl?.id) {
      inventoryQtyDrafts[qtyEl.id] = previousValue;
    }
    if (qtyEl) {
      qtyEl.value = previousValue;
    }
    showMessage(inventoryNotice, error.message, true);
    restoreInventoryScroll();
  }
};
document.getElementById("logoutInventoryAdmin").onclick = async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
};
(async function init() {
  try {
    await ensureInventoryAdmin();
    await loadInventoryPage();
    subscribeRealtime("inventory.updated", async () => {
      try {
        saveInventoryScroll();
        await loadInventoryPage();
      } catch {}
    });
    subscribeRealtime("order.created", async () => {
      try {
        saveInventoryScroll();
        await loadInventoryPage();
      } catch {}
    });
  } catch (error) {
    showMessage(inventoryNotice, error.message, true);
  }
})();
