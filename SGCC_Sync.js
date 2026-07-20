/**
 * 网上国网数据同步（Egern）
 *
 * GitHub:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Sync.js
 *
 * 账号只从模块参数传入的 $argument 读取（sgmodule 的 USERNAME / PASSWORD）。
 * 无需也不依赖脚本 Env。
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

function parseArg(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object") return raw;
  const out = {};
  String(raw)
    .replace(/^\?/, "")
    .split("&")
    .forEach((pair) => {
      if (!pair) return;
      const i = pair.indexOf("=");
      const k = decodeURIComponent((i >= 0 ? pair.slice(0, i) : pair).trim());
      let v = decodeURIComponent((i >= 0 ? pair.slice(i + 1) : "").trim());
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (k) out[k] = v;
    });
  return out;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && String(obj[k]).trim() !== "") {
      return String(obj[k]).trim();
    }
  }
  return "";
}

function readArgument() {
  try {
    if (typeof $argument !== "undefined" && $argument != null) {
      return parseArg($argument);
    }
  } catch (_) {}
  return {};
}

function writeAuth(username, password) {
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
      $persistentStore.write(username, "95598_username");
      $persistentStore.write(password, "95598_password");
    }
  } catch (_) {}
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

function diagnose(status, text, parsed, hasArg) {
  const body = String(text || "").trim();
  const msg = String(
    (parsed && (parsed.message || parsed.error || parsed.subt)) || body
  );

  if (msg.includes("未配置") || (msg.includes("账号") && msg.includes("密码"))) {
    return {
      code: "NO_AUTH",
      tip: `【未配置账号】请到模块参数填写 USERNAME/PASSWORD 并保存。argument已传入=${hasArg}`,
    };
  }
  if (!parsed && (status === 400 || body.toLowerCase().includes("bad request"))) {
    return {
      code: "HTTP400",
      tip: `【HTTP400】请确认：模块已启用、参数已填、MITM开且证书信任、VPN开。argument=${hasArg} body=${body.slice(0, 50) || "(空)"}`,
    };
  }
  if (!parsed) {
    return {
      code: "PARSE",
      tip: `【响应异常】status=${status} body=${body.slice(0, 80) || "(空)"}`,
    };
  }

  const list = normalizeList(parsed);
  if (!list.length) {
    return { code: "EMPTY", tip: "【空数据】无户号，确认国网已绑定户号" };
  }
  if (list.some((x) => hasBalance(x) || hasUsage(x) || x?.userInfo)) {
    if (!list.some(hasBalance)) {
      return { code: "PARTIAL", tip: "【部分成功】余额空，用电量可显示" };
    }
    return { code: "OK", tip: "【成功】" };
  }
  return { code: "EMPTY_FIELDS", tip: "【字段全空】稍后重试" };
}

export default async function (ctx) {
  const arg = readArgument();
  const username = pick(arg, [
    "username",
    "USERNAME",
    "SGCC_USERNAME",
    "95598_username",
  ]);
  const password = pick(arg, [
    "password",
    "PASSWORD",
    "SGCC_PASSWORD",
    "95598_password",
  ]);
  const hasArg = !!(username && password);

  if (hasArg) writeAuth(username, password);

  if (!hasArg) {
    const tip =
      "【未配置账号】sgmodule 请在「模块参数」填 USERNAME、PASSWORD（脚本内无法设 Env）";
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({ title: "网上国网同步失败", body: tip });
    return;
  }

  const logs = [`arg尾号${username.slice(-4)}`];
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

      const diag = diagnose(resp.status, text, parsed, hasArg);
      lastDiag = { ...diag, status: resp.status, proto, time: Date.now() };
      logs.push(`${proto}→${resp.status}/${diag.code}`);

      const list = normalizeList(parsed);
      const useful = list.some(
        (info) => hasBalance(info) || hasUsage(info) || info?.userInfo
      );
      if (useful) {
        const warnings = summarize(list);
        ctx.storage.setJSON(CACHE_KEY, {
          data: list,
          time: Date.now(),
          source: url,
          warnings,
          diag: lastDiag,
        });
        ctx.storage.delete(ERROR_KEY);
        ctx.storage.setJSON(DIAG_KEY, lastDiag);
        ctx.notify({
          title: "网上国网同步",
          body: `${diag.tip}｜户数${list.length}${
            warnings.length ? "｜" + warnings.join(",") : ""
          }｜${logs.join("；")}`,
        });
        return;
      }
    } catch (e) {
      lastDiag = {
        code: "THROW",
        tip: `【异常】${e.message || e}`,
        time: Date.now(),
      };
      logs.push(`${proto}异常`);
    }
  }

  ctx.storage.setJSON(ERROR_KEY, {
    message: (lastDiag && lastDiag.tip) || "同步失败",
    time: Date.now(),
  });
  if (lastDiag) ctx.storage.setJSON(DIAG_KEY, lastDiag);
  ctx.notify({
    title: "网上国网同步失败",
    body: `${(lastDiag && lastDiag.tip) || "未知错误"}｜${logs.join("；")}`,
  });
}
