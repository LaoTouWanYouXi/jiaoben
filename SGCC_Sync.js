/**
 * 网上国网数据同步（Egern 手动导入）
 *
 * 地址:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Sync.js
 *
 * 添加方式：
 *   类型: generic（再复制一条 schedule 也可）
 *   超时: 90
 *   Env（建议与重写脚本填一样）:
 *     USERNAME = 手机号
 *     PASSWORD = 密码
 *
 * 先保证「接口重写」脚本已添加且 Env 已填，再运行本脚本。
 */

const QUERY =
  "eleBill=1&dayElecQuantity=1&dayElecQuantity31=1&monthElecQuantity=1";

const API_CANDIDATES = [
  `http://api.wsgw-rewrite.com/electricity/bill/all?${QUERY}`,
  `https://api.wsgw-rewrite.com/electricity/bill/all?${QUERY}`,
];

const CACHE_KEY = "sgcc_bill_all";
const ERROR_KEY = "sgcc_widget_error";
const DIAG_KEY = "sgcc_last_diag";

function pick(env, keys) {
  for (const k of keys) {
    const v = env && env[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function dayList(info) {
  const a = info?.dayElecQuantity31?.sevenEleList;
  const b = info?.dayElecQuantity?.sevenEleList;
  return Array.isArray(a) && a.length ? a : Array.isArray(b) ? b : [];
}

function hasBalance(info) {
  const bill = info?.eleBill;
  if (!bill || typeof bill !== "object") return false;
  if (Object.keys(bill).length === 0) return false;
  return bill.sumMoney != null || bill.accountBalance != null;
}

function hasUsage(info) {
  return dayList(info).some((item) => {
    const v = item?.dayElePq;
    return v !== "-" && v != null && String(v).trim() !== "";
  });
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && typeof data === "object") return [data];
  return [];
}

function summarize(list) {
  const tips = [];
  list.forEach((info, i) => {
    if (!hasBalance(info)) tips.push(`${i}账单空`);
    if (!hasUsage(info)) tips.push(`${i}电量空`);
  });
  return tips;
}

export default async function (ctx) {
  const username = pick(ctx.env, [
    "USERNAME",
    "SGCC_USERNAME",
    "username",
  ]);
  const password = pick(ctx.env, [
    "PASSWORD",
    "SGCC_PASSWORD",
    "password",
  ]);

  if (username && password) {
    try {
      ctx.storage.set("sgcc_username", username);
      ctx.storage.set("sgcc_password", password);
      ctx.storage.set("95598_username", username);
      ctx.storage.set("95598_password", password);
    } catch (_) {}
  }

  const logs = [
    username ? `env尾号${username.slice(-4)}` : "env无账号(依赖重写脚本Env)",
  ];
  let lastDiag = null;

  for (const url of API_CANDIDATES) {
    const proto = url.startsWith("https") ? "https" : "http";
    try {
      const resp = await ctx.http.get(url, { timeout: 55 });
      const text = await resp.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      const msg = String(
        (parsed && (parsed.message || parsed.error || parsed.subt)) || text || ""
      );

      if (msg.includes("未配置") || (msg.includes("账号") && msg.includes("密码"))) {
        lastDiag = {
          tip: "【未配置】请到「接口重写」脚本 Env 填写 USERNAME、PASSWORD",
          status: resp.status,
        };
        logs.push(`${proto}→未配置账号`);
        continue;
      }

      const list = normalizeList(parsed);
      const useful = list.some(
        (info) => hasBalance(info) || hasUsage(info) || info?.userInfo
      );

      if (useful) {
        const warnings = summarize(list);
        const tip = list.some(hasBalance)
          ? "【成功】"
          : "【部分成功】余额空，用电量可显示";
        ctx.storage.setJSON(CACHE_KEY, {
          data: list,
          time: Date.now(),
          source: url,
          warnings,
        });
        ctx.storage.delete(ERROR_KEY);
        ctx.storage.setJSON(DIAG_KEY, { tip, status: resp.status, time: Date.now() });
        ctx.notify({
          title: "网上国网同步",
          body: `${tip}｜户数${list.length}${
            warnings.length ? "｜" + warnings.join(",") : ""
          }｜${logs.join("；")}`,
        });
        return;
      }

      lastDiag = {
        tip: `【无数据】HTTP${resp.status} ${msg.slice(0, 80) || "(空)"}`,
        status: resp.status,
      };
      logs.push(`${proto}→${resp.status}`);
    } catch (e) {
      lastDiag = { tip: `【异常】${e.message || e}`, status: -1 };
      logs.push(`${proto}异常`);
    }
  }

  const tip = (lastDiag && lastDiag.tip) || "同步失败";
  ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
  ctx.notify({ title: "网上国网同步失败", body: `${tip}｜${logs.join("；")}` });
}
