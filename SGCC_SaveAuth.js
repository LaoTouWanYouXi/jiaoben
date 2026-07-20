/**
 * 网上国网 · 保存账号（Egern）
 *
 * GitHub:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_SaveAuth.js
 *
 * 在本脚本 Env 填写：
 *   USERNAME = 手机号
 *   PASSWORD = 密码
 *
 * 运行一次即可。会写入 95598.js 能读取的本地存储。
 */

function pick(env, keys) {
  for (const k of keys) {
    const v = env && env[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function writeStore(key, value) {
  let ok = false;
  try {
    if (typeof $persistentStore !== "undefined" && $persistentStore.write) {
      $persistentStore.write(String(value), key);
      ok = true;
    }
  } catch (_) {}
  return ok;
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

export default async function (ctx) {
  const arg = readArgument();
  const username =
    pick(ctx.env, ["USERNAME", "SGCC_USERNAME", "username", "95598_username"]) ||
    pick(arg, ["USERNAME", "SGCC_USERNAME", "username", "95598_username"]);
  const password =
    pick(ctx.env, ["PASSWORD", "SGCC_PASSWORD", "password", "95598_password"]) ||
    pick(arg, ["PASSWORD", "SGCC_PASSWORD", "password", "95598_password"]);

  if (!username || !password) {
    ctx.notify({
      title: "网上国网",
      body: "未读到账号：请在本脚本 Env 填写 USERNAME 和 PASSWORD 后再运行",
    });
    return;
  }

  const a = writeStore("95598_username", username);
  const b = writeStore("95598_password", password);

  // 兼容部分环境用 prefs
  try {
    if (typeof $prefs !== "undefined" && $prefs.setValueForKey) {
      $prefs.setValueForKey(username, "95598_username");
      $prefs.setValueForKey(password, "95598_password");
    }
  } catch (_) {}

  ctx.storage.set("sgcc_username", username);
  ctx.storage.set("sgcc_password", password);
  ctx.storage.setJSON("sgcc_auth_meta", {
    userTail: username.slice(-4),
    time: Date.now(),
  });

  ctx.notify({
    title: "网上国网",
    body: a || b
      ? `账号已保存（尾号 ${username.slice(-4)}），请再运行「手动同步」`
      : `已写入脚本存储（尾号 ${username.slice(-4)}）。若同步仍提示未配置，说明当前环境无 $persistentStore，请把账号填在「接口重写」脚本的 argument/Env`,
  });
}
