const ordersGate = document.getElementById("ordersGate");
const ordersContent = document.getElementById("ordersContent");
const ordersAdminNotice = document.getElementById("ordersAdminNotice");
const ordersAdminTable = document.getElementById("ordersAdminTable");
const ordersAdminName = document.getElementById("ordersAdminName");

async function ensureOrdersAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    ordersGate.classList.remove("hidden");
    ordersContent.classList.add("hidden");
    throw new Error("Bạn cần đăng nhập tài khoản ADMIN để vào trang đơn hàng.");
  }
  ordersAdminName.textContent = user.fullName || user.username;
  ordersGate.classList.add("hidden");
  ordersContent.classList.remove("hidden");
}

async function loadOrdersAdmin() {
  const orders = await api.get("/api/v1/payments/admin-orders");
  renderOrdersAdmin(orders || []);
}

function renderOrdersAdmin(orders) {
  const safeOrders = [...(orders || [])].sort((a, b) => {
    const ao = Number(a?.orderNumber || 0);
    const bo = Number(b?.orderNumber || 0);
    if (ao !== bo) return ao - bo;
    return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
  });
  if (!safeOrders.length) {
    ordersAdminTable.innerHTML =
      '<tr><td colspan="9" class="meta center-cell">Chưa có đơn hàng nào.</td></tr>';
    return;
  }
  ordersAdminTable.innerHTML = safeOrders
    .map((item) => {
      const buyer = item.user?.fullName || item.user?.username || "Khách hàng";
      const products = (item.products || [])
        .map((p) => `${p.title} x ${p.quantity}`)
        .join(", ");
      const created = item.createdAt ?
        new Date(item.createdAt).toLocaleString("vi-VN") :
        "";
      const methodText = item.paymentMethod === "bank" ? "Chuyển khoản" : "COD";
      const paymentStatus = item.paymentStatus || "pending";
      const deliveryStatus = item.deliveryStatus || "pending";
      const canDelete = paymentStatus === "paid" && deliveryStatus === "delivered";
      return `
      <tr>
        <td class="order-number-cell center-cell"><strong>${Number(item.orderNumber || 0) || ""}</strong></td>
        <td class="order-buyer-cell"><strong>${buyer}</strong><div class="meta">${item.user?.email || ""}</div></td>
        <td class="order-product-cell">${products}</td>
        <td class="order-method-cell center-cell">${methodText}</td>
        <td>
          <select class="admin-select" onchange="updateAdminOrderField('${item._id}','status', this.value)">
            <option value="pending" ${paymentStatus === "pending" ? "selected" : ""}>Chưa thanh toán</option>
            <option value="paid" ${paymentStatus === "paid" ? "selected" : ""}>Đã thanh toán</option>
          </select>
        </td>
        <td>
          <select class="admin-select" onchange="updateAdminOrderField('${item._id}','deliveryStatus', this.value)">
            <option value="pending" ${deliveryStatus === "pending" ? "selected" : ""}>Chưa giao</option>
            <option value="shipping" ${deliveryStatus === "shipping" ? "selected" : ""}>Đang giao</option>
            <option value="delivered" ${deliveryStatus === "delivered" ? "selected" : ""}>Đã giao</option>
          </select>
        </td>
        <td class="order-total-cell center-cell">${formatPrice(item.amount)}</td>
        <td class="order-date-cell center-cell">${created}</td>
        <td class="order-action-cell center-cell">
          <button class="btn danger admin-delete-order-btn" type="button" onclick="deleteAdminOrder('${item._id}')" ${canDelete ? '' : 'disabled'}>Xóa</button>
        </td>
      </tr>`;
    })
    .join("");
}

window.updateAdminOrderField = async (id, field, value) => {
  try {
    const body =
      field === "status" ? {
        status: value
      } : {
        deliveryStatus: value
      };
    await api.put("/api/v1/payments/admin-orders/" + id + "/status", body);
    showMessage(ordersAdminNotice, "Đã cập nhật trạng thái đơn hàng");
    await loadOrdersAdmin();
  } catch (error) {
    showMessage(ordersAdminNotice, error.message, true);
  }
};



window.deleteAdminOrder = async (id) => {
  const confirmed = window.confirm('Bạn có chắc muốn xóa đơn hàng này?');
  if (!confirmed) return;
  try {
    await api.delete('/api/v1/payments/admin-orders/' + id);
    showMessage(ordersAdminNotice, 'Đã xóa đơn hàng');
    await loadOrdersAdmin();
  } catch (error) {
    showMessage(ordersAdminNotice, error.message, true);
  }
};

document.getElementById("logoutOrdersAdmin").onclick = async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
};

(async function init() {
  try {
    await ensureOrdersAdmin();
    await loadOrdersAdmin();
    subscribeRealtime("order.created", async () => {
      try {
        await loadOrdersAdmin();
      } catch {}
    });
    subscribeRealtime("order.updated", async () => {
      try {
        await loadOrdersAdmin();
      } catch {}
    });
  } catch (error) {
    showMessage(ordersAdminNotice, error.message, true);
  }
})();
