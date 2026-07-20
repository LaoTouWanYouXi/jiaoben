/**
 * 网上国网用电小组件（Egern 手动导入）
 *
 * 地址:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Widget.JS
 *
 * 添加方式：
 *   类型: generic
 *   超时: 30
 *   不必填账号
 *   然后在「小组件画廊」关联本脚本
 *
 * 依赖：先成功运行「同步」脚本写入缓存
 */

const CACHE_KEY = "sgcc_bill_all";
const ERROR_KEY = "sgcc_widget_error";
const DIAG_KEY = "sgcc_last_diag";

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(v, digits = 2) {
  const n = toNum(v);
  if (n === null) return "--";
  return String(Number(n.toFixed(digits)));
}

function dayStamp(day) {
  return String(day || "").replace(/-/g, "").slice(0, 8);
}

function pickDayList(info) {
  const a = info?.dayElecQuantity31?.sevenEleList;
  const b = info?.dayElecQuantity?.sevenEleList;
  const list = Array.isArray(a) && a.length ? a : Array.isArray(b) ? b : [];
  return list.filter((item) => {
    const v = item?.dayElePq;
    return v !== "-" && v != null && String(v).trim() !== "";
  });
}

function sumCurrentMonth(dayList) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  let sum = 0;
  let hit = false;
  for (const item of dayList) {
    const stamp = dayStamp(item.day);
    if (stamp.startsWith(ym)) {
      const n = toNum(item.dayElePq);
      if (n !== null) {
        sum += n;
        hit = true;
      }
    }
  }
  return hit ? sum : null;
}

function pickBalance(info) {
  const bill = info?.eleBill;
  if (!bill || typeof bill !== "object" || !Object.keys(bill).length) return null;
  if (info?.arrearsOfFees) {
    const owe = toNum(bill.sumMoney);
    if (owe !== null) return -Math.abs(owe);
  }
  if (bill.accountBalance != null && String(bill.accountBalance).trim() !== "") {
    return bill.accountBalance;
  }
  return bill.sumMoney ?? null;
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

function parsePayload(raw, index) {
  const list = normalizeList(raw);
  if (!list.length) throw new Error("无缓存：请先运行同步脚本");

  const idx = Math.max(0, parseInt(index || "0", 10) || 0);
  const info = list[idx] || list[0];
  if (!info) throw new Error("户号下标无效");

  const days = pickDayList(info);
  const bal = pickBalance(info);
  const yst = days.length ? days[days.length - 1].dayElePq : null;
  const total = sumCurrentMonth(days);

  if (bal == null && yst == null && total == null && !info.userInfo) {
    throw new Error("缓存无效");
  }
  return { yst, total, bal, billEmpty: bal == null };
}

function cacheAgeText(time) {
  if (!time) return "";
  const m = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (m < 60) return `${m}分钟前`;
  return `${Math.round(m / 60)}小时前`;
}

export default async function (ctx) {
  const index = (ctx.env.Index || "0").trim();

  const colors = {
    bg: { light: "#FFFFFF", dark: "#2C2C2E" },
    border: { light: "#E5E5EA", dark: "#3A3A3C" },
    title: { light: "#666666", dark: "#8E8E93" },
    value: { light: "#1C1C1E", dark: "#FFFFFF" },
    time: { light: "#999999", dark: "#666666" },
    error: { light: "#FF3B30", dark: "#FF453A" },
    capsuleBg: { light: "#F5F5F7", dark: "#3A3A3C" },
    accent: { light: "#007AFF", dark: "#0A84FF" },
  };

  let data = {
    yst: { title: "昨日用电", value: "--", unit: "度" },
    total: { title: "本月累计", value: "--", unit: "度" },
    bal: { title: "账户余额", value: "--", unit: "元" },
    updateTime: "--:--",
    sourceTag: "",
    error: null,
    hint: "",
  };

  try {
    const cached = ctx.storage.getJSON(CACHE_KEY);
    const diag = ctx.storage.getJSON(DIAG_KEY);
    const errCache = ctx.storage.getJSON(ERROR_KEY);

    if (!cached?.data) {
      throw new Error(
        (diag && diag.tip) ||
          (errCache && errCache.message) ||
          "无缓存：请先运行同步脚本"
      );
    }

    const parsed = parsePayload(cached.data, index);
    data.yst.value = fmt(parsed.yst);
    data.total.value = fmt(parsed.total);
    data.bal.value = fmt(parsed.bal);
    data.updateTime = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    });
    data.sourceTag = `缓存 ${cacheAgeText(cached.time)}`;
    if (parsed.billEmpty) data.hint = "余额空";
  } catch (e) {
    data.error = "无可用数据";
    data.hint = String(e.message || e).slice(0, 140);
  }

  function makeCapsule(title, value, unit, isNegative = false) {
    const valueColor =
      isNegative && parseFloat(value) < 0 ? colors.error : colors.value;
    return {
      type: "stack",
      direction: "column",
      alignItems: "center",
      flex: 1,
      padding: [8, 10, 8, 10],
      backgroundColor: colors.capsuleBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      children: [
        {
          type: "text",
          text: title,
          font: { size: "caption2", weight: "medium" },
          textColor: colors.title,
          maxLines: 1,
        },
        {
          type: "stack",
          direction: "row",
          alignItems: "center",
          gap: 3,
          children: [
            {
              type: "text",
              text: String(value),
              font: { size: "title2", weight: "semibold" },
              textColor: valueColor,
            },
            {
              type: "text",
              text: unit,
              font: { size: "caption2", weight: "regular" },
              textColor: colors.title,
            },
          ],
        },
      ],
    };
  }

  const isSmall = ctx.widgetFamily === "systemSmall";

  function makeSmallCapsule(title, value, unit) {
    return {
      type: "stack",
      direction: "row",
      alignItems: "center",
      padding: [6, 14, 6, 14],
      backgroundColor: colors.capsuleBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      children: [
        {
          type: "text",
          text: `${title} ${value}${unit ? " " + unit : ""}`,
          font: { size: "body", weight: "medium" },
          textColor: colors.title,
          textAlign: "center",
          maxLines: 1,
        },
      ],
    };
  }

  function wrapCenter(child) {
    return {
      type: "stack",
      direction: "row",
      children: [{ type: "spacer" }, child, { type: "spacer" }],
    };
  }

  const bodyChildren = data.error
    ? [
        {
          type: "text",
          text: data.error,
          font: { size: "subheadline", weight: "semibold" },
          textColor: colors.error,
        },
        {
          type: "text",
          text: data.hint,
          font: { size: "caption2" },
          textColor: colors.time,
          maxLines: 5,
        },
      ]
    : [
        {
          type: "stack",
          direction: isSmall ? "column" : "row",
          alignItems: "center",
          gap: isSmall ? 6 : 9,
          children: isSmall
            ? [
                wrapCenter(makeSmallCapsule("昨日", data.yst.value, "度")),
                wrapCenter(makeSmallCapsule("本月", data.total.value, "度")),
                wrapCenter(makeSmallCapsule("余额", data.bal.value, "元")),
              ]
            : [
                makeCapsule(data.yst.title, data.yst.value, data.yst.unit),
                makeCapsule(data.total.title, data.total.value, data.total.unit),
                makeCapsule(data.bal.title, data.bal.value, data.bal.unit, true),
              ],
        },
        {
          type: "text",
          text: [data.sourceTag, data.hint].filter(Boolean).join(" · "),
          font: { size: "caption2" },
          textColor: colors.time,
          maxLines: 2,
        },
      ];

  return {
    type: "widget",
    backgroundColor: colors.bg,
    padding: isSmall ? [10, 12, 10, 12] : [10, 14, 10, 14],
    gap: isSmall ? 6 : 10,
    refreshAfter: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    children: [
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        children: [
          {
            type: "stack",
            direction: "row",
            alignItems: "center",
            gap: isSmall ? 5 : 7,
            children: [
              {
                type: "image",
                src: "sf-symbol:bolt.square.fill",
                color: colors.accent,
                width: isSmall ? 14 : 18,
                height: isSmall ? 14 : 18,
              },
              {
                type: "text",
                text: "网上国网",
                font: {
                  size: isSmall ? "subheadline" : "headline",
                  weight: "semibold",
                },
                textColor: colors.value,
              },
            ],
          },
          { type: "spacer" },
          {
            type: "text",
            text: data.updateTime,
            font: { size: "caption2" },
            textColor: colors.time,
          },
        ],
      },
      ...bodyChildren,
    ],
  };
}
