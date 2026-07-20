/**
 * 网上国网数据同步 / 诊断（Egern）
 *
 * GitHub:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Sync.js
 *
 * 重要：95598 重写脚本在 Egern 里经常读不到模块参数。
 * 请先运行 SGCC_SaveAuth.js，或在本脚本 Env 填写 USERNAME / PASSWORD。
 *
 * Env：
 *   USERNAME / PASSWORD  账号密码（推荐写这里）
 *   ClearCache=1         先清缓存再同步
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

function readArgument() {
  try {
    if (typeof $argument === "undefined" || $argument == null) return {};
    let a = $argument;
    if (typeof a === "string") {
      const o = {};
      String(a)
        .replace(/^\?/, "")
        .split("&")
        .forEach((pair) => {
          if (!pair) return;
          const i = pair.indexOf("=");
          const k = decodeURIComponent(i >= 0 ? pair.slice(0, i) : pair);
          const v = decodeURIComponent(i >= 0 ? pair.slice(i + 1) : "");
          if (k) o[k] = v;
        });
      return o;
    }
    return typeof a === "object" ? a : {};
  } catch (_) {
    return {};
  }
}

function ensureAuth(ctx) {
  const arg = readArgument();
  const username =
    pick(ctx.env, ["USERNAME", "SGCC_USERNAME", "username", "95598_username"]) ||
    pick(arg, ["USERNAME", "SGCC_USERNAME", "username", "95598_username"]);
  const password =
    pick(ctx.env, ["PASSWORD", "SGCC_PASSWORD", "password", "95598_password"]) ||
    pick(arg, ["PASSWORD", "SGCC_PASSWORD", "password", "95598_password"]);

  // 环境变量 / argument 优先；否则用已保存的
  const u = username || ctx.storage.get("sgcc_username") || "";
  const p = password || ctx.storage.get("sgcc_password") || "";

  let wrote = false;
  if (u && p) {
    try {
      if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
        $persistentStore.write(u, "95598_username");
        $persistentStore.write(p, "95598_password");
        wrote = true;
      }
    } catch (_) {}
    try {
      if (typeof $prefs !== "undefined" && $prefs.setValueForKey) {
        $prefs.setValueForKey(u, "95598_username");
        $prefs.setValueForKey(p, "95598_password");
        wrote = true;
      }
    } catch (_) {}
    ctx.storage.set("sgcc_username", u);
    ctx.storage.set("sgcc_password", p);
  }

  let storedUser = "";
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.read) {
      storedUser = $persistentStore.read("95598_username") || "";
    }
  } catch (_) {}

  return {
    hasEnv: !!(username && password),
    hasStored: !!(storedUser || ctx.storage.get("sgcc_username")),
    wrote,
    userTail: (u || storedUser || "").slice(-4),
  };
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
    const name =
      info?.userInfo?.consName_dst ||
      info?.userInfo?.consNo_dst ||
      `户${i}`;
    if (!hasBalance(info)) tips.push(`${i}账单空`);
    if (!hasUsage(info)) tips.push(`${i}电量空`);
    if (info?.userInfo) tips.push(`${i}:${String(name).slice(0, 8)}`);
  });
  return tips;
}

function diagnose(status, text, parsed, auth) {
  const body = String(text || "").trim();
  const lower = body.toLowerCase();
  const msg = String(
    (parsed && (parsed.message || parsed.error || parsed.subt || parsed.body)) ||
      body
  );

  if (
    msg.includes("未配置") ||
    msg.includes("账号和密码") ||
    msg.includes("账号密码") ||
    (msg.includes("账号") && msg.includes("密码"))
  ) {
    return {
      code: "NO_AUTH",
      tip: `【未配置账号】重写脚本没读到密码。请打开「保存账号」或「手动同步」脚本 Env，填写 USERNAME/PASSWORD 后先跑「保存账号」。当前: env=${auth.hasEnv} store=${auth.hasStored} tail=${auth.userTail || "-"}`,
    };
  }

  if (!parsed) {
    if (status === 400 || lower.includes("bad request")) {
      return {
        code: "MITM_OR_AUTH",
        tip: `【HTTP400】常见两类：1) 账号未进重写脚本 2) MITM未拦住。先跑「保存账号」。env=${auth.hasEnv} store=${auth.hasStored} body=${body.slice(0, 60) || "(空)"}`,
      };
    }
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return { code: "TIMEOUT", tip: "【超时】把 TIMEOUT 调到 90 后重试" };
    }
    return {
      code: "PARSE",
      tip: `【响应异常】status=${status} body=${body.slice(0, 80) || "(空)"}`,
    };
  }

  const list = normalizeList(parsed);
  if (!list.length) {
    return {
      code: "EMPTY",
      tip: "【空数据】无户号，确认国网已绑定用电户号",
    };
  }

  const anyBal = list.some(hasBalance);
  const anyUse = list.some(hasUsage);
  const anyUser = list.some((x) => x && x.userInfo);

  if (anyUser || anyUse || anyBal) {
    if (!anyBal) {
      return {
        code: "PARTIAL",
        tip: "【部分成功】已拦住；余额空、用电量可显示",
      };
    }
    return { code: "OK", tip: "【成功】数据完整" };
  }

  return {
    code: "EMPTY_FIELDS",
    tip: "【字段全空】登录态可能失效，ClearCache=1 后重试",
  };
}

export default async function (ctx) {
  const clear = String(ctx.env.ClearCache || "").trim() === "1";
  if (clear) {
    ctx.storage.delete(CACHE_KEY);
    ctx.storage.delete(ERROR_KEY);
    ctx.storage.delete(DIAG_KEY);
  }

  const auth = ensureAuth(ctx);
  const logs = [];
  if (clear) logs.push("已清缓存");
  logs.push(`auth:env=${auth.hasEnv}/store=${auth.hasStored}/write=${auth.wrote}`);

  if (!auth.hasEnv && !auth.hasStored) {
    const tip =
      "【未配置账号】请在「手动同步」或「保存账号」脚本的 Env 里填写 USERNAME、PASSWORD（不要只填在模块参数里，Egern 经常传不进 95598）";
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.storage.setJSON(DIAG_KEY, { code: "NO_AUTH", tip, time: Date.now() });
    ctx.notify({ title: "网上国网同步失败", body: tip });
    return;
  }

  let lastDiag = null;
  let saved = false;

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

      // 95598 错误对象常见结构
      if (
        parsed &&
        !Array.isArray(parsed) &&
        !parsed.data &&
        (parsed.message || parsed.subt || parsed.title)
      ) {
        // keep parsed for diagnose
      }

      const diag = diagnose(resp.status, text, parsed, auth);
      lastDiag = {
        ...diag,
        status: resp.status,
        proto,
        bodyPreview: String(text || "").slice(0, 120),
        time: Date.now(),
      };
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
        saved = true;

        ctx.notify({
          title: "网上国网同步",
          body: `${diag.tip}｜户数${list.length}${
            warnings.length ? "｜" + warnings.join(",") : ""
          }｜${logs.join("；")}`,
        });
        return;
      }
    } catch (e) {
      const msg = e.message || String(e);
      lastDiag = {
        code: "THROW",
        tip: `【异常】${msg}`,
        status: -1,
        proto,
        bodyPreview: msg.slice(0, 100),
        time: Date.now(),
      };
      logs.push(`${proto}异常:${msg.slice(0, 40)}`);
    }
  }

  if (!saved) {
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
}
