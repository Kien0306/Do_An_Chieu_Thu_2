const rewardNotice = document.getElementById("rewardNotice");
const rewardGate = document.getElementById("rewardGate");
const rewardContent = document.getElementById("rewardContent");
const rewardCouponTable = document.getElementById("rewardCouponTable");
const rewardAdminName = document.getElementById("rewardAdminName");

function formatRewardDiscount(item) {
  return item.type === "percent" ?
    `${Number(item.value || 0)}%` :
    formatPrice(item.value || 0);
}

function formatRewardCap(item) {
  if (!Number(item.maxDiscount || 0))
    return item.type === "percent" ? "Không giới hạn" : "-";
  return formatPrice(item.maxDiscount || 0);
}
async function ensure() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    rewardGate.classList.remove("hidden");
    rewardContent.classList.add("hidden");
    throw new Error("Bạn cần đăng nhập ADMIN.");
  }
  rewardAdminName.textContent = user.fullName || user.username;
  rewardGate.classList.add("hidden");
  rewardContent.classList.remove("hidden");
}
async function load() {
  const items = await api.get("/api/v1/coupons?group=reward").catch(() => []);
  rewardCouponTable.innerHTML = items.length ?
    items
    .map(
      (item) =>
      `<tr><td><strong>${Number(item.pointsCost || 0).toLocaleString("vi-VN")}</strong></td><td>${formatRewardDiscount(item)}</td><td>${formatRewardCap(item)}</td><td>${Number(item.rewardStock || 0).toLocaleString("vi-VN")}</td><td>${item.isActive ? "Đang bật" : "Đã tắt"}</td><td><div class='admin-user-actions'><a class='btn secondary' href='/admin/reward-coupons/edit/${item._id}'>Sửa</a><button class='btn danger' onclick="deleteRewardCoupon('${item._id}')">Xoá</button></div></td></tr>`,
    )
    .join("") :
    '<tr><td colspan="6" class="meta">Chưa có mã đổi điểm.</td></tr>';
}
window.deleteRewardCoupon = async (id) => {
  try {
    await api.delete("/api/v1/coupons/" + id);
    showMessage(rewardNotice, "Đã xoá mã đổi điểm");
    await load();
  } catch (error) {
    showMessage(rewardNotice, error.message, true);
  }
};
document.getElementById("logoutRewardAdmin").onclick = async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
};
(async () => {
  try {
    await ensure();
    await load();
    subscribeRealtime("coupon.updated", async () => {
      try {
        await load();
      } catch {}
    });
  } catch (error) {
    showMessage(rewardNotice, error.message, true);
  }
})();
