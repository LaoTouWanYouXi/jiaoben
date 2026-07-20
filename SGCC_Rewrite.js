/**
 * 网上国网 · 接口重写（Egern 手动导入）
 *
 * 地址:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Rewrite.js
 *
 * 添加方式（工具 → 脚本 → +）：
 *   类型: http_request
 *   匹配: ^https?:\/\/api\.wsgw-rewrite\.com\/electricity\/bill\/all
 *   脚本: 上面地址（或本地文件）
 *   超时: 90
 *   需要 Body: 否
 *   Env:
 *     USERNAME = 手机号
 *     PASSWORD = 密码
 *
 * 同时在 MITM 主机名加入: api.wsgw-rewrite.com
 */

const SGCC_JS =
  "https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/95598/95598.js";

function pickEnv(env, keys) {
  for (const k of keys) {
    const v = env && env[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

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

function installShims(ctx, username, password) {
  const store = Object.create(null);

  // 预写入账号，供 95598 读取
  store["95598_username"] = username;
  store["95598_password"] = password;
  store["95598_service_mode"] = "true";

  try {
    const oldU = ctx.storage.get("95598_username");
    const oldP = ctx.storage.get("95598_password");
    if (oldU) store["95598_username"] = oldU;
    if (oldP) store["95598_password"] = oldP;
  } catch (_) {}

  // 以本次 Env 为准
  store["95598_username"] = username;
  store["95598_password"] = password;

  globalThis.$persistentStore = {
    read(key) {
      try {
        const v = ctx.storage.get(key);
        if (v != null && v !== "") return v;
      } catch (_) {}
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    write(value, key) {
      store[key] = String(value);
      try {
        ctx.storage.set(key, String(value));
      } catch (_) {}
      return true;
    },
  };

  globalThis.$argument = `username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}&service=true&debug=false`;

  globalThis.$request = {
    url: (ctx.request && ctx.request.url) || "",
    method: (ctx.request && ctx.request.method) || "GET",
    headers: {},
    body: "",
  };

  const httpCall = async (method, opts) => {
    const option = typeof opts === "string" ? { url: opts } : opts || {};
    const url = option.url;
    const headers = option.headers || {};
    const body = option.body;
    const timeout = option.timeout || 30;
    const m = String(method).toLowerCase();
    const resp = await ctx.http[m](url, { headers, body, timeout });
    const status = resp.status;
    const text = await resp.text();
    const hdrs = {};
    try {
      if (resp.headers && typeof resp.headers.forEach === "function") {
        resp.headers.forEach((v, k) => {
          hdrs[k] = v;
        });
      }
    } catch (_) {}
    return { status, headers: hdrs, body: text };
  };

  const wrap = (method) => (opts, cb) => {
    Promise.resolve()
      .then(() => httpCall(method, opts))
      .then((r) => {
        const fakeResp = {
          status: r.status,
          statusCode: r.status,
          headers: r.headers,
        };
        if (typeof cb === "function") cb(null, fakeResp, r.body);
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

  // 通知（可选）
  if (typeof globalThis.$notification === "undefined") {
    globalThis.$notification = {
      post(title, subt, body) {
        try {
          ctx.notify({
            title: String(title || ""),
            body: [subt, body].filter(Boolean).join("\n"),
          });
        } catch (_) {}
      },
    };
  }
}

export default async function (ctx) {
  const arg = parseArg(
    typeof $argument !== "undefined" && $argument != null ? $argument : ""
  );

  const username =
    pickEnv(ctx.env, ["USERNAME", "SGCC_USERNAME", "username"]) ||
    pickEnv(arg, ["USERNAME", "username", "SGCC_USERNAME"]);
  const password =
    pickEnv(ctx.env, ["PASSWORD", "SGCC_PASSWORD", "password"]) ||
    pickEnv(arg, ["PASSWORD", "password", "SGCC_PASSWORD"]);

  if (!username || !password) {
    return ctx.respond({
      status: 400,
      headers: { "content-type": "application/json;charset=utf8" },
      body: JSON.stringify({
        message:
          "未配置账号密码：请在本「接口重写」脚本的 Env 填写 USERNAME、PASSWORD",
      }),
    });
  }

  try {
    ctx.storage.set("sgcc_username", username);
    ctx.storage.set("sgcc_password", password);
    ctx.storage.set("95598_username", username);
    ctx.storage.set("95598_password", password);
  } catch (_) {}

  return await new Promise(async (resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      try {
        if (payload && payload.response) {
          resolve(ctx.respond(payload.response));
          return;
        }
        if (payload && (payload.status || payload.body != null)) {
          resolve(
            ctx.respond({
              status: payload.status || 200,
              headers: payload.headers || {
                "content-type": "application/json;charset=utf8",
              },
              body: payload.body,
            })
          );
          return;
        }
        resolve(
          ctx.respond({
            status: 200,
            headers: { "content-type": "application/json;charset=utf8" },
            body: typeof payload === "string" ? payload : JSON.stringify(payload),
          })
        );
      } catch (e) {
        resolve(
          ctx.respond({
            status: 400,
            headers: { "content-type": "application/json;charset=utf8" },
            body: JSON.stringify({
              message: "respond 失败: " + (e.message || e),
            }),
          })
        );
      }
    };

    try {
      installShims(ctx, username, password);
      globalThis.$done = finish;

      const resp = await ctx.http.get(SGCC_JS, { timeout: 30 });
      const code = await resp.text();
      if (!code || resp.status >= 400) {
        finish({
          response: {
            status: 400,
            headers: { "content-type": "application/json;charset=utf8" },
            body: JSON.stringify({
              message: "下载 95598.js 失败 status=" + resp.status,
            }),
          },
        });
        return;
      }

      // 启动官方脚本（内部异步结束后会调 $done）
      (0, eval)(code);

      // 防止卡死
      setTimeout(() => {
        finish({
          response: {
            status: 400,
            headers: { "content-type": "application/json;charset=utf8" },
            body: JSON.stringify({
              message: "95598.js 执行超时，请把超时调到 90 秒后重试",
            }),
          },
        });
      }, 80000);
    } catch (e) {
      finish({
        response: {
          status: 400,
          headers: { "content-type": "application/json;charset=utf8" },
          body: JSON.stringify({
            message: "重写执行失败: " + (e.message || e),
          }),
        },
      });
    }
  });
}
