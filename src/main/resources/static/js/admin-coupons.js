function couponAdminEl(id) {
  return document.getElementById(id);
}
const couponGate = couponAdminEl("couponGate");
const couponContent = couponAdminEl("couponContent");
const couponNotice = couponAdminEl("couponNotice");
const couponTable = couponAdminEl("couponTable");
const couponAdminName = couponAdminEl("couponAdminName");
async function ensureCouponAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    couponGate.classList.remove("hidden");
    couponContent.classList.add("hidden");
    throw new Error("Bạn cần đăng nhập ADMIN để vào trang mã giảm giá.");
  }
  couponAdminName.textContent = user.fullName || user.username;
  couponGate.classList.add("hidden");
  couponContent.classList.remove("hidden");
}

function formatCouponType(item) {
  return item.type === "percent" ? "Giảm theo %" : "Giảm tiền cố định";
}

function formatCouponValue(item) {
  return item.type === "percent" ?
    `${Number(item.value || 0)}%` :
    `${Number(item.value || 0).toLocaleString("vi-VN")}đ`;
}

function formatCouponCap(item) {
  return Number(item.maxDiscount || 0) > 0 ?
    `${Number(item.maxDiscount || 0).toLocaleString("vi-VN")}đ` :
    "-";
}
async function loadCoupons() {
  const items = await api.get("/api/v1/coupons?group=payment").catch(() => []);
  couponTable.innerHTML = items.length ?
    items
    .map(
      (item) =>
      `<tr><td><strong>${item.code || ""}</strong></td><td>${item.title || ""}</td><td>${formatCouponType(item)}</td><td>${formatCouponValue(item)}</td><td>${Number(item.minOrderAmount || 0).toLocaleString("vi-VN")}đ</td><td>${formatCouponCap(item)}</td><td>${item.isActive ? "Đang bật" : "Đã tắt"}</td><td><div class='admin-user-actions'><a class='btn secondary' href='/admin/coupons/edit/${item._id}'>Sửa</a><button class='btn danger' onclick="deleteCoupon('${item._id}')">Xoá</button></div></td></tr>`,
    )
    .join("") :
    '<tr><td colspan="8" class="meta">Chưa có mã giảm giá.</td></tr>';
}
window.deleteCoupon = async (id) => {
  if (!confirm("Bạn có chắc muốn xoá mã giảm giá này?")) return;
  try {
    await api.delete("/api/v1/coupons/" + id);
    showMessage(couponNotice, "Đã xoá mã giảm giá");
    await loadCoupons();
  } catch (error) {
    showMessage(
      couponNotice,
      error.message || "Không thể xoá mã giảm giá",
      true,
    );
  }
};
couponAdminEl("logoutCouponAdmin")?.addEventListener("click", async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
});
(async function init() {
  try {
    await ensureCouponAdmin();
    await loadCoupons();
    subscribeRealtime("coupon.updated", async () => {
      try {
        await loadCoupons();
      } catch {}
    });
  } catch (error) {
    showMessage(
      couponNotice,
      error.message || "Không thể tải danh sách mã giảm giá",
      true,
    );
  }
})();
