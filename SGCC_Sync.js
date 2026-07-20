/**
 * 网上国网数据同步（Egern · 独立运行，不需要重写 / MITM）
 *
 * 地址:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Sync.js
 *
 * 工具 → 脚本 → +
 *   类型: generic
 *   超时: 90
 *   Env:
 *     USERNAME = 手机号
 *     PASSWORD = 密码
 *
 * 只需本脚本 + SGCC_Widget.JS。不要再添加 SGCC_Rewrite.js。
 */

const SGCC_JS =
  "https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/95598/95598.js";

const FAKE_URL =
  "https://api.wsgw-rewrite.com/electricity/bill/all?eleBill=1&dayElecQuantity=1&dayElecQuantity31=1&monthElecQuantity=1";

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
  if (data && typeof data === "object") {
    if (data.message || data.error || data.subt) return [];
    return [data];
  }
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

function installRuntime(ctx, username, password) {
  const mem = Object.create(null);
  mem["95598_username"] = username;
  mem["95598_password"] = password;
  mem["95598_service_mode"] = "true";

  globalThis.Egern = true;
  globalThis.$environment = { "egern-version": "1" };

  globalThis.$persistentStore = {
    read(key) {
      try {
        const v = ctx.storage.get(key);
        if (v != null && String(v) !== "") return String(v);
      } catch (_) {}
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
    },
    write(value, key) {
      mem[key] = String(value);
      try {
        ctx.storage.set(key, String(value));
      } catch (_) {}
      return true;
    },
  };

  globalThis.$argument =
    `username=${encodeURIComponent(username)}` +
    `&password=${encodeURIComponent(password)}` +
    `&service=true&debug=false`;

  globalThis.$request = {
    url: FAKE_URL,
    method: "GET",
    headers: {},
    body: "",
  };

  const call = async (method, opts) => {
    const option = typeof opts === "string" ? { url: opts } : opts || {};
    const url = option.url;
    if (!url) throw new Error("missing url");
    const m = String(method).toLowerCase();
    const resp = await ctx.http[m](url, {
      headers: option.headers || {},
      body: option.body,
      timeout: option.timeout || 30,
    });
    const text = await resp.text();
    return {
      status: resp.status,
      statusCode: resp.status,
      headers: {},
      body: text,
    };
  };

  const wrap = (method) => (opts, cb) => {
    Promise.resolve()
      .then(() => call(method, opts))
      .then((r) => {
        if (typeof cb === "function") cb(null, r, r.body);
      })
      .catch((e) => {
        if (typeof cb === "function") cb(e, null, null);
      });
  };

  globalThis.$httpClient = {
    get: wrap("get"),
    post: wrap("post"),
    put: wrap("put"),
    delete: wrap("delete"),
    head: wrap("head"),
    patch: wrap("patch"),
  };

  globalThis.$notification = {
    post(title, subt, body) {
      try {
        ctx.notify({
          title: String(title || "网上国网"),
          body: [subt, body].filter(Boolean).join("\n").slice(0, 300),
        });
      } catch (_) {}
    },
  };
}

function extractBody(result) {
  if (result == null) return null;
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return null;
    }
  }
  if (result.response) {
    const b = result.response.body;
    if (typeof b === "string") {
      try {
        return JSON.parse(b);
      } catch {
        return null;
      }
    }
    return b;
  }
  if (result.body != null) {
    const b = result.body;
    if (typeof b === "string") {
      try {
        return JSON.parse(b);
      } catch {
        return null;
      }
    }
    return b;
  }
  if (Array.isArray(result)) return result;
  if (result.data) return result.data;
  return result;
}

function run95598(ctx, username, password) {
  return new Promise(async (resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    try {
      installRuntime(ctx, username, password);
      globalThis.$done = (result) => finish({ ok: true, result });

      const resp = await ctx.http.get(SGCC_JS, { timeout: 30 });
      const code = await resp.text();
      if (!code || resp.status >= 400) {
        finish({
          ok: false,
          message: `下载 95598.js 失败 HTTP${resp.status}`,
        });
        return;
      }

      try {
        (0, eval)(code);
      } catch (e) {
        finish({
          ok: false,
          message: `执行 95598.js 失败: ${e.message || e}`,
        });
        return;
      }

      // 超时兜底（不用 setTimeout 名称冲突时也能用 Promise）
      Promise.resolve()
        .then(
          () =>
            new Promise((r) => {
              const id = setTimeout(r, 80000);
              // 若环境无 setTimeout，立即失败
              if (id == null && typeof setTimeout !== "function") r();
            })
        )
        .then(() => {
          finish({ ok: false, message: "95598.js 执行超时（>80s）" });
        });
    } catch (e) {
      finish({ ok: false, message: e.message || String(e) });
    }
  });
}

export default async function (ctx) {
  const username = pick(ctx.env, ["USERNAME", "SGCC_USERNAME", "username"]);
  const password = pick(ctx.env, ["PASSWORD", "SGCC_PASSWORD", "password"]);

  if (!username || !password) {
    const tip = "【未配置】请在本同步脚本 Env 填写 USERNAME、PASSWORD";
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({ title: "网上国网同步失败", body: tip });
    return;
  }

  try {
    ctx.storage.set("sgcc_username", username);
    ctx.storage.set("sgcc_password", password);
  } catch (_) {}

  ctx.notify({
    title: "网上国网",
    body: `开始同步（尾号 ${username.slice(-4)}）…`,
  });

  const out = await run95598(ctx, username, password);
  if (!out || !out.ok) {
    const tip = `【失败】${(out && out.message) || "未知错误"}`;
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.storage.setJSON(DIAG_KEY, { tip, time: Date.now() });
    ctx.notify({ title: "网上国网同步失败", body: tip });
    return;
  }

  const parsed = extractBody(out.result);
  const list = normalizeList(parsed);

  if (
    parsed &&
    !list.length &&
    (parsed.message || parsed.error || parsed.subt)
  ) {
    const tip = `【国网返回】${parsed.message || parsed.error || parsed.subt}`;
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({ title: "网上国网同步失败", body: tip });
    return;
  }

  const useful = list.some(
    (info) => hasBalance(info) || hasUsage(info) || info?.userInfo
  );
  if (!useful) {
    const tip = "【空数据】未解析到户号，可能登录失败或风控";
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({
      title: "网上国网同步失败",
      body: `${tip}｜${JSON.stringify(parsed).slice(0, 120)}`,
    });
    return;
  }

  const warnings = summarize(list);
  const tip = list.some(hasBalance)
    ? "【成功】"
    : "【部分成功】余额空，用电量可显示";

  ctx.storage.setJSON(CACHE_KEY, {
    data: list,
    time: Date.now(),
    source: "95598-inline",
    warnings,
  });
  ctx.storage.delete(ERROR_KEY);
  ctx.storage.setJSON(DIAG_KEY, { tip, time: Date.now() });

  ctx.notify({
    title: "网上国网同步",
    body: `${tip}｜户数${list.length}${
      warnings.length ? "｜" + warnings.join(",") : ""
    }｜尾号${username.slice(-4)}`,
  });
}
