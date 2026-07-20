/**
 * 网上国网数据同步（Egern · 独立运行）
 *
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Sync.js
 *
 * 类型: generic | 超时: 90
 * Env: USERNAME / PASSWORD
 *
 * 若提示「账号OK但查询400」：登录已成功，电量/余额接口失败，脚本会尽量缓存已有字段。
 */

const SGCC_JS =
  "https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/95598/95598.js";

// 不带查询参数，让 95598 按默认拉取；失败字段会自己填缺省
const FAKE_URL = "https://api.wsgw-rewrite.com/electricity/bill/all";

const CACHE_KEY = "sgcc_bill_all";
const ERROR_KEY = "sgcc_widget_error";
const DIAG_KEY = "sgcc_last_diag";
const RAW_KEY = "sgcc_last_raw";

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

function hasUser(info) {
  return !!(info && info.userInfo && (info.userInfo.consNo_dst || info.userInfo.consName_dst || info.userInfo.consNo));
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && typeof data === "object") {
    // 错误对象
    if (data.message || data.error || data.subt || data.title) {
      // 有时错误对象里仍夹带 list
      if (Array.isArray(data.list)) return data.list;
      return [];
    }
    // 单户对象
    if (data.userInfo || data.eleBill || data.dayElecQuantity) return [data];
    return [data];
  }
  return [];
}

function summarize(list) {
  const tips = [];
  list.forEach((info, i) => {
    if (hasUser(info)) tips.push(`${i}有账号`);
    if (!hasBalance(info)) tips.push(`${i}账单空`);
    if (!hasUsage(info)) tips.push(`${i}电量空`);
  });
  return tips;
}

function flattenHeaders(h) {
  const out = {};
  if (!h) return out;
  try {
    if (typeof h.forEach === "function") {
      h.forEach((v, k) => {
        out[k] = v;
      });
      return out;
    }
  } catch (_) {}
  if (typeof h === "object") {
    for (const k of Object.keys(h)) out[k] = h[k];
  }
  return out;
}

function installRuntime(ctx, username, password, httpLog) {
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
    const option = typeof opts === "string" ? { url: opts } : { ...(opts || {}) };
    const url = option.url;
    if (!url) throw new Error("missing url");

    let body = option.body;
    const headers = flattenHeaders(option.headers);

    // Surge: body 为对象时自动 JSON，并设 Content-Type
    if (
      body != null &&
      typeof body === "object" &&
      typeof ArrayBuffer !== "undefined" &&
      !(body instanceof ArrayBuffer) &&
      !ArrayBuffer.isView?.(body)
    ) {
      body = JSON.stringify(body);
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json;charset=UTF-8";
      }
    }

    const m = String(method).toLowerCase();
    const resp = await ctx.http[m](url, {
      headers,
      body,
      timeout: option.timeout || 45,
    });
    const text = await resp.text();
    const status = resp.status;
    const shortUrl = String(url).replace(/^https?:\/\//, "").slice(0, 48);

    if (status >= 400) {
      httpLog.push(`${m.toUpperCase()} ${status} ${shortUrl}`);
    }

    return {
      status,
      statusCode: status,
      headers: flattenHeaders(resp.headers),
      body: text,
      ok: status >= 200 && status < 300,
    };
  };

  const wrap = (method) => (opts, cb) => {
    // 兼容：有人只传 url 字符串
    Promise.resolve()
      .then(() => call(method, opts))
      .then((r) => {
        if (typeof cb === "function") cb(null, r, r.body);
      })
      .catch((e) => {
        httpLog.push(`${method} ERR ${e.message || e}`);
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
          body: [subt, body].filter(Boolean).join("\n").slice(0, 350),
        });
      } catch (_) {}
    },
  };
}

function extractBody(result) {
  if (result == null) return null;

  // $done() 空
  if (typeof result === "undefined") return null;

  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { message: result };
    }
  }

  // 直接数组
  if (Array.isArray(result)) return result;

  // $done({ response: { status, body } })
  if (result.response) {
    const resp = result.response;
    const b = resp.body;
    let parsed = b;
    if (typeof b === "string") {
      try {
        parsed = JSON.parse(b);
      } catch {
        parsed = { message: b, httpStatus: resp.status };
      }
    }
    // 把 HTTP status 挂上去便于诊断
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      parsed.__httpStatus = resp.status;
    }
    return parsed;
  }

  if (result.body != null) {
    const b = result.body;
    if (typeof b === "string") {
      try {
        return JSON.parse(b);
      } catch {
        return { message: b };
      }
    }
    return b;
  }

  if (result.data) return result.data;
  return result;
}

function run95598(ctx, username, password, httpLog) {
  return new Promise(async (resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };

    try {
      installRuntime(ctx, username, password, httpLog);
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

      const t = setTimeout(() => {
        finish({ ok: false, message: "95598.js 执行超时（>85s）" });
      }, 85000);

      const prevDone = globalThis.$done;
      globalThis.$done = (result) => {
        try {
          clearTimeout(t);
        } catch (_) {}
        prevDone(result);
      };
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

  const httpLog = [];

  ctx.notify({
    title: "网上国网",
    body: `开始同步（尾号 ${username.slice(-4)}）…`,
  });

  const out = await run95598(ctx, username, password, httpLog);

  // 保存原始结果便于排查
  try {
    ctx.storage.set(
      RAW_KEY,
      JSON.stringify({
        ok: !!(out && out.ok),
        result: out && out.result,
        httpLog,
        time: Date.now(),
      }).slice(0, 8000)
    );
  } catch (_) {}

  if (!out || !out.ok) {
    const tip = `【失败】${(out && out.message) || "未知错误"}`;
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({
      title: "网上国网同步失败",
      body: `${tip}${httpLog.length ? "｜" + httpLog.slice(-3).join("；") : ""}`,
    });
    return;
  }

  const parsed = extractBody(out.result);
  const list = normalizeList(parsed);
  const httpStatus = parsed && parsed.__httpStatus;

  // 明确的脚本错误对象
  if (
    parsed &&
    !list.length &&
    (parsed.message || parsed.error || parsed.subt || parsed.body)
  ) {
    const tip = `【国网/脚本】${
      parsed.message || parsed.error || parsed.subt || parsed.body
    }`;
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({
      title: "网上国网同步失败",
      body: `${tip}${httpLog.length ? "｜HTTP:" + httpLog.slice(-3).join(",") : ""}`,
    });
    return;
  }

  const anyUser = list.some(hasUser);
  const anyBal = list.some(hasBalance);
  const anyUse = list.some(hasUsage);
  const useful = anyUser || anyBal || anyUse;

  if (!useful) {
    const tip =
      httpStatus === 400 || httpLog.some((x) => x.includes(" 400 "))
        ? "【账号可能OK但查询400】电量/余额接口失败，原始结果无可用字段"
        : "【空数据】未解析到户号或用电字段";
    ctx.storage.setJSON(ERROR_KEY, { message: tip, time: Date.now() });
    ctx.notify({
      title: "网上国网同步失败",
      body: `${tip}｜${httpLog.slice(-4).join("；") || JSON.stringify(parsed).slice(0, 100)}`,
    });
    return;
  }

  // 有账号但没电量/余额：仍缓存，方便确认登录通了
  const warnings = summarize(list);
  let tip;
  if (anyBal || anyUse) {
    tip = anyBal ? "【成功】" : "【部分成功】有用电量，余额空";
  } else {
    tip =
      "【仅账号】登录成功，但电量/余额查询失败(常见HTTP400)。可隔几小时再同步";
  }

  ctx.storage.setJSON(CACHE_KEY, {
    data: list,
    time: Date.now(),
    source: "95598-inline",
    warnings,
  });

  if (anyBal || anyUse) {
    ctx.storage.delete(ERROR_KEY);
  } else {
    ctx.storage.setJSON(ERROR_KEY, {
      message: tip,
      time: Date.now(),
    });
  }
  ctx.storage.setJSON(DIAG_KEY, {
    tip,
    httpLog: httpLog.slice(-8),
    time: Date.now(),
  });

  ctx.notify({
    title: "网上国网同步",
    body: `${tip}｜户数${list.length}｜${warnings.join(",") || "ok"}${
      httpLog.length ? "｜" + httpLog.slice(-3).join("；") : ""
    }`,
  });
}
