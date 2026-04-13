const revenueGate = document.getElementById("revenueGate");
const revenueContent = document.getElementById("revenueContent");
const revenueAdminName = document.getElementById("revenueAdminName");

function compactMoney(value) {
  const num = Number(value || 0);
  if (num === 0) return "0";
  if (num % 1000000 === 0) return `${num / 1000000}tr`;
  if (num >= 1000000)
    return `${(num / 1000000).toFixed(1).replace(".0", "")}tr`;
  if (num % 1000 === 0) return `${num / 1000}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(".0", "")}k`;
  return `${num}`;
}

function exactMoneyLabel(value) {
  return formatPrice(Number(value || 0));
}

function safeText(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (m) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[
      m
    ],
  );
}

async function ensureRevenueAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    revenueGate.classList.remove("hidden");
    revenueContent.classList.add("hidden");
    throw new Error(
      "Bạn cần đăng nhập tài khoản ADMIN để vào trang doanh thu.",
    );
  }
  revenueAdminName.textContent = user.fullName || user.username;
  revenueGate.classList.add("hidden");
  revenueContent.classList.remove("hidden");
}

function renderSummary(metrics) {
  document.getElementById("kpiRevenue").textContent = formatPrice(
    metrics.totalRevenue || 0,
  );
  document.getElementById("kpiPaidRevenue").textContent = formatPrice(
    metrics.paidRevenue || 0,
  );
  document.getElementById("kpiOrders").textContent = metrics.orderCount || 0;
}

function renderBarTrend({
  targetId,
  totalId,
  data = [],
  emptyText,
  labelKey,
  labelFormatter,
  axisMax,
}) {
  const wrap = document.getElementById(targetId);
  if (!wrap) return;
  const total = data.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const totalEl = document.getElementById(totalId);
  if (totalEl) totalEl.textContent = formatPrice(total);
  if (!data.length) {
    wrap.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  const rawMax = Math.max(...data.map((item) => Number(item.revenue || 0)), 1);
  const maxValue = Math.max(Number(axisMax || 0), rawMax, 1);
  const axisValues = [maxValue, Math.round(maxValue / 2), 0];
  wrap.innerHTML = `
    <div class="trend-axis">
      ${axisValues.map((value) => `<span>${compactMoney(value)}</span>`).join("")}
    </div>
    <div class="trend-plot" style="display:flex;align-items:flex-end;justify-content:flex-start;gap:12px;">
      ${data
        .map((item) => {
          const height = Math.max(
            8,
            Math.round((Number(item.revenue || 0) / maxValue) * 180),
          );
          const rawLabel = item[labelKey] || "";
          return `
          <div class="trend-col">
            <div class="trend-bar-wrap">
              <span class="trend-value">${exactMoneyLabel(item.revenue || 0)}</span>
              <div class="trend-bar" style="height:${height}px"></div>
            </div>
            <div class="trend-date">${safeText(labelFormatter(rawLabel))}</div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderTrend(metrics) {
  renderBarTrend({
    targetId: "trendChart",
    totalId: "trendGrowth",
    data: metrics.trend || [],
    emptyText: "Chưa có dữ liệu doanh thu.",
    labelKey: "date",
    labelFormatter: (value) =>
      String(value || "")
      .slice(5)
      .replace("-", "/"),
    axisMax: 10000000,
  });
}

function renderMonthlyTrend(metrics) {
  renderBarTrend({
    targetId: "monthlyTrendChart",
    totalId: "monthlyGrowth",
    data: metrics.monthlyTrend || [],
    emptyText: "Chưa có dữ liệu doanh thu theo tháng.",
    labelKey: "month",
    labelFormatter: (value) => {
      const [, month] = String(value || "").split("-");
      if (!month) return value || "";
      return `Tháng ${Number(month)}`;
    },
    axisMax: 100000000,
  });
}

function renderTopSelling(items) {
  const wrap = document.getElementById("topSellingChart");
  document.getElementById("topSellingCount").textContent =
    `${items.length} sản phẩm`;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state">Chưa có dữ liệu bán hàng.</div>';
    return;
  }
  const maxValue = Math.max(
    ...items.map((item) => Number(item.soldCount || 0)),
    1,
  );
  wrap.innerHTML = items
    .slice(0, 6)
    .map((item) => {
      const width = Math.max(
        12,
        Math.round((Number(item.soldCount || 0) / maxValue) * 100),
      );
      return `
      <div class="top-selling-item">
        <div class="top-selling-head">
          <span>${safeText(item.title)}</span>
          <strong>${item.soldCount}</strong>
        </div>
        <div class="top-selling-track"><div class="top-selling-bar" style="width:${width}%"></div></div>
      </div>
    `;
    })
    .join("");
}

async function loadRevenuePage() {
  const [metrics, topSelling] = await Promise.all([
    api
    .get("/api/v1/dashboard/revenue-metrics")
    .catch(() => ({
      totalRevenue: 0,
      paidRevenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
      paymentGroups: {
        paid: 0,
        pending: 0
      },
      trend: [],
    })),
    api.get("/api/v1/dashboard/top-selling").catch(() => []),
  ]);
  renderSummary(metrics);
  renderTrend(metrics);
  renderMonthlyTrend(metrics);
  renderTopSelling(topSelling || []);
}

document.getElementById("logoutRevenueAdmin").onclick = async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
};

let revenueRefreshTimer = null;
let revenueRefreshInFlight = false;

async function refreshRevenueRealtime() {
  if (revenueRefreshInFlight) return;
  revenueRefreshInFlight = true;
  try {
    await loadRevenuePage();
  } catch (error) {
    console.error("Không thể cập nhật realtime trang doanh thu", error);
  } finally {
    revenueRefreshInFlight = false;
  }
}

function enableRevenueRealtime() {
  ["dashboard.updated", "order.updated"].forEach((eventName) => {
    subscribeRealtime(eventName, () => {
      refreshRevenueRealtime();
    });
  });
  if (revenueRefreshTimer) clearInterval(revenueRefreshTimer);
  revenueRefreshTimer = setInterval(refreshRevenueRealtime, 3000);
}

window.addEventListener("beforeunload", () => {
  if (revenueRefreshTimer) clearInterval(revenueRefreshTimer);
});

(async function init() {
  try {
    await ensureRevenueAdmin();
    await loadRevenuePage();
    enableRevenueRealtime();
  } catch (error) {
    const gate = document.getElementById("revenueGate");
    showMessage(gate, error.message, true);
  }
})();
