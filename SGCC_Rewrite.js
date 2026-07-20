/**
 * 网上国网 · 接口重写入口（Egern / Surge）
 *
 * GitHub:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Rewrite.js
 *
 * 作用：从模块 argument 读取账号，写入 95598 可读取的本地存储，再加载官方 95598.js
 * 账号只在 sgmodule 的 USERNAME / PASSWORD 参数里配置即可。
 */

const SGCC_JS =
  "https://raw.githubusercontent.com/Yuheng0101/X/main/Tasks/95598/95598.js";

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
      // 去掉可能残留的引号
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

function writeAuth(username, password) {
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
      $persistentStore.write(username, "95598_username");
      $persistentStore.write(password, "95598_password");
      $persistentStore.write("true", "95598_service_mode");
    }
  } catch (_) {}
  try {
    if (typeof $prefs !== "undefined" && $prefs.setValueForKey) {
      $prefs.setValueForKey(username, "95598_username");
      $prefs.setValueForKey(password, "95598_password");
    }
  } catch (_) {}
}

function fail(msg) {
  const body = JSON.stringify({
    message: msg,
    title: "网上国网",
    subt: "账号未就绪",
  });
  const response = {
    status: 400,
    headers: { "content-type": "application/json;charset=utf8" },
    body,
  };
  if (typeof $done === "function") {
    // Surge / Egern 兼容
    try {
      $done({ response });
    } catch (_) {
      try {
        $done(response);
      } catch (__) {}
    }
  }
}

function run95598(username, password) {
  // 确保 95598 能从 $argument 读到
  const argStr = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(
    password
  )}&service=true&debug=false`;
  try {
    globalThis.$argument = argStr;
  } catch (_) {}
  try {
    $argument = argStr;
  } catch (_) {}

  if (typeof $httpClient === "undefined" || !$httpClient.get) {
    fail("当前环境无 $httpClient，无法加载 95598.js");
    return;
  }

  $httpClient.get({ url: SGCC_JS, timeout: 30 }, (err, resp, body) => {
    if (err || !body) {
      fail("下载 95598.js 失败: " + (err || "empty body"));
      return;
    }
    try {
      // 95598 为自执行脚本，内部会 $done
      (0, eval)(body);
    } catch (e) {
      fail("执行 95598.js 失败: " + (e && e.message ? e.message : e));
    }
  });
}

(function main() {
  const arg = parseArg(typeof $argument !== "undefined" ? $argument : "");
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

  if (!username || !password) {
    fail(
      "未配置账号密码：请在模块参数 USERNAME / PASSWORD 中填写（不要填脚本 Env）"
    );
    return;
  }

  writeAuth(username, password);
  run95598(username, password);
})();
