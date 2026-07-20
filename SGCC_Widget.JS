/**
 * 网上国网用电小组件（Egern）
 *
 * 依赖：需先启用「网上国网」模块（SGCC_Egern.yaml），由模块拦截并返回数据。
 *
 *# ── 环境变量配置 ──
 * Index: "0"          （多户号时填写下标，默认 0）
 * ApiUrl: ""          （可选，默认走重写接口）
 *
 * 使用说明
 * 1. 工具 → 脚本 → 添加 generic 脚本，粘贴本文件；超时建议设为 60 秒
 * 2. 工具 → 模块 → 添加 SGCC_Egern.yaml，填写账号密码并启用
 * 3. 开启 MITM，信任 Egern CA；小组件刷新时保持 VPN 开启
 * 4. 分析 → 小组件画廊 → 添加本脚本对应小组件
 */

const DEFAULT_API = "https://api.wsgw-rewrite.com/electricity/bill/all";

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
  if (!list.length) throw new Error("接口无数据，请检查模块账号密码 / MITM");

  const idx = Math.max(0, parseInt(index || "0", 10) || 0);
  const info = list[idx] || list[0];
  if (!info) throw new Error("户号下标无效");

  const dayList = pickDayList(info);
  const yst = dayList.length ? dayList[dayList.length - 1].dayElePq : null;
  const month = sumCurrentMonth(dayList);

  return {
    yst,
    total: month,
    bal: pickBalance(info),
  };
}

export default async function (ctx) {
  const apiUrl = (ctx.env.ApiUrl || DEFAULT_API).trim() || DEFAULT_API;
  const index = (ctx.env.Index || "0").trim();

  const colors = {
    bg:        { light: "#FFFFFF", dark: "#2C2C2E" },
    border:    { light: "#E5E5EA", dark: "#3A3A3C" },
    title:     { light: "#666666", dark: "#8E8E93" },
    value:     { light: "#1C1C1E", dark: "#FFFFFF" },
    time:      { light: "#999999", dark: "#666666" },
    error:     { light: "#FF3B30", dark: "#FF453A" },
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
    const resp = await ctx.http.get(apiUrl, { timeout: 55 });
    const raw = await resp.json();
    const parsed = parsePayload(raw, index);

    data.yst.value = fmt(parsed.yst);
    data.total.value = fmt(parsed.total);
    data.bal.value = fmt(parsed.bal);
    data.updateTime = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    });
  } catch (e) {
    data.error = "请求失败";
    data.debugInfo.push(`错误: ${e.message || e}`);
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
      children: [
        { type: "spacer" },
        child,
        { type: "spacer" },
      ],
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
          text: (data.debugInfo && data.debugInfo[0]) || "请检查模块与 MITM",
          font: { size: "caption2" },
          textColor: colors.time,
          maxLines: 3,
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
    // 国网有登录风控，刷新别太勤
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
