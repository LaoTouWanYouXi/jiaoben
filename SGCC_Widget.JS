/**
 * 网上国网用电小组件（Egern）
 *
 * GitHub:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Widget.JS
 *
 * 依赖：启用 SGCC_Egern.sgmodule，并至少成功运行一次 SGCC_Sync.js
 *
 *# ── 环境变量 ──
 * Index: "0"     多户号下标，默认 0
 * ApiUrl: ""     留空则自动尝试 http/https 重写地址
 *
 * 排错顺序：
 * 1. 模块里填好 USERNAME / PASSWORD
 * 2. MITM 已开启且证书已信任
 * 3. 手动运行「网上国网手动同步」，确认通知显示同步成功
 * 4. 再刷新小组件（保持 VPN 开启）
 */

const DEFAULT_APIS = [
  "http://api.wsgw-rewrite.com/electricity/bill/all",
  "https://api.wsgw-rewrite.com/electricity/bill/all",
];

const CACHE_KEY = "sgcc_bill_all";
const ERROR_KEY = "sgcc_widget_error";

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
  const bill = info?.eleBill || {};
  if (info?.arrearsOfFees) {
    const owe = toNum(bill.sumMoney);
    if (owe !== null) return -Math.abs(owe);
  }
  if (bill.accountBalance != null && String(bill.accountBalance).trim() !== "") {
    return bill.accountBalance;
  }
  return bill.sumMoney;
}

function parsePayload(raw, index) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (!list.length) throw new Error("接口无数据");

  const idx = Math.max(0, parseInt(index || "0", 10) || 0);
  const info = list[idx] || list[0];
  if (!info) throw new Error("户号下标无效");

  if (info.__error) throw new Error(info.__error);

  const dayList = pickDayList(info);
  return {
    yst: dayList.length ? dayList[dayList.length - 1].dayElePq : null,
    total: sumCurrentMonth(dayList),
    bal: pickBalance(info),
  };
}

function explainError(status, body, fallback) {
  const text = String(body || fallback || "").trim();
  const lower = text.toLowerCase();

  if (status === 400 || lower.includes("400")) {
    if (text.includes("账号") || text.includes("密码") || text.includes("未配置")) {
      return "模块未配置账号密码，请在模块 Env 填写 USERNAME/PASSWORD";
    }
    return "拦截失败(400)：请确认 MITM 已开、证书已信任，并手动运行「网上国网同步」";
  }
  if (lower.includes("body error")) {
    return "响应异常：请先运行「网上国网同步」脚本，再刷新小组件";
  }
  if (text) return text.slice(0, 120);
  return fallback || "未知错误";
}

async function fetchRemote(ctx, urls) {
  let lastMsg = "网络请求失败";

  for (const url of urls) {
    try {
      const resp = await ctx.http.get(url, { timeout: 55 });
      const text = await resp.text();

      if (resp.status >= 400) {
        lastMsg = explainError(resp.status, text, `HTTP ${resp.status}`);
        continue;
      }

      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        lastMsg = explainError(resp.status, text, "响应不是 JSON");
        continue;
      }

      ctx.storage.setJSON(CACHE_KEY, { data: raw, time: Date.now(), source: url });
      ctx.storage.delete(ERROR_KEY);
      return raw;
    } catch (e) {
      lastMsg = explainError(0, "", e.message || String(e));
    }
  }

  throw new Error(lastMsg);
}

async function loadBillData(ctx, index) {
  const custom = (ctx.env.ApiUrl || "").trim();
  const urls = custom ? [custom] : DEFAULT_APIS;

  const cached = ctx.storage.getJSON(CACHE_KEY);
  const cacheAgeMs = cached?.time ? Date.now() - cached.time : Infinity;
  const cacheFresh = cacheAgeMs < 6 * 60 * 60 * 1000;

  if (cached?.data && cacheFresh) {
    try {
      return {
        parsed: parsePayload(cached.data, index),
        fromCache: true,
        cacheTime: cached.time,
      };
    } catch {
      // 缓存损坏则继续拉取
    }
  }

  try {
    const raw = await fetchRemote(ctx, urls);
    return { parsed: parsePayload(raw, index), fromCache: false };
  } catch (e) {
    if (cached?.data) {
      return {
        parsed: parsePayload(cached.data, index),
        fromCache: true,
        cacheTime: cached.time,
        stale: true,
        warn: e.message,
      };
    }

    const errCache = ctx.storage.getJSON(ERROR_KEY);
    if (errCache?.message) {
      throw new Error(`${e.message}；最近同步失败：${errCache.message}`);
    }
    throw e;
  }
}

export default async function (ctx) {
  const index = (ctx.env.Index || "0").trim();

  const colors = {
    bg:        { light: "#FFFFFF", dark: "#2C2C2E" },
    border:    { light: "#E5E5EA", dark: "#3A3A3C" },
    title:     { light: "#666666", dark: "#8E8E93" },
    value:     { light: "#1C1C1E", dark: "#FFFFFF" },
    time:      { light: "#999999", dark: "#666666" },
    error:     { light: "#FF3B30", dark: "#FF453A" },
    warn:      { light: "#FF9500", dark: "#FF9F0A" },
    capsuleBg: { light: "#F5F5F7", dark: "#3A3A3C" },
    accent:    { light: "#007AFF", dark: "#0A84FF" },
  };

  let data = {
    yst:   { title: "昨日用电", value: "--", unit: "度" },
    total: { title: "本月累计", value: "--", unit: "度" },
    bal:   { title: "账户余额", value: "--", unit: "元" },
    updateTime: "--:--",
    error: null,
    debugInfo: [],
  };

  try {
    const result = await loadBillData(ctx, index);
    data.yst.value = fmt(result.parsed.yst);
    data.total.value = fmt(result.parsed.total);
    data.bal.value = fmt(result.parsed.bal);
    data.updateTime = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    });
    if (result.stale && result.warn) {
      data.debugInfo.push(`缓存数据(${result.warn})`);
    } else if (result.fromCache) {
      data.debugInfo.push("缓存");
    }
  } catch (e) {
    data.error = "获取失败";
    data.debugInfo.push(explainError(0, "", e.message || String(e)));
  }

  function makeCapsule(title, value, unit, isNegative = false) {
    const valueColor = isNegative && parseFloat(value) < 0 ? colors.error : colors.value;

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
          numberOfLines: 1,
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
          text: data.debugInfo[0] || "请先运行网上国网同步脚本",
          font: { size: "caption2" },
          textColor: colors.time,
          maxLines: 4,
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
      ];

  return {
    type: "widget",
    backgroundColor: colors.bg,
    padding: isSmall ? [10, 12, 10, 12] : [10, 14, 10, 14],
    gap: isSmall ? 6 : 12,
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
                font: { size: isSmall ? "subheadline" : "headline", weight: "semibold" },
                textColor: colors.value,
              },
            ],
          },
          { type: "spacer" },
          {
            type: "stack",
            direction: "row",
            alignItems: "center",
            gap: 5,
            children: [
              {
                type: "image",
                src: "sf-symbol:arrow.clockwise",
                color: colors.time,
                width: 12,
                height: 12,
              },
              {
                type: "text",
                text: data.updateTime,
                font: { size: "caption2" },
                textColor: colors.time,
              },
            ],
          },
        ],
      },
      ...bodyChildren,
      {
        type: "stack",
        direction: "row",
        alignItems: "center",
        children: [
          { type: "spacer" },
          {
            type: "stack",
            width: 48,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.border,
          },
          { type: "spacer" },
        ],
      },
    ],
  };
}
