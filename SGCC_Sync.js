/**
 * 网上国网数据同步（Egern）
 *
 * 用途：定时或手动拉取电费数据，写入 ctx.storage 供小组件读取。
 * 建议：模块启用后，在 工具 → 脚本 中手动运行一次本脚本测试。
 */

const API_CANDIDATES = [
  "http://api.wsgw-rewrite.com/electricity/bill/all",
  "https://api.wsgw-rewrite.com/electricity/bill/all",
];

export default async function (ctx) {
  let lastError = null;

  for (const url of API_CANDIDATES) {
    try {
      const resp = await ctx.http.get(url, { timeout: 55 });
      const text = await resp.text();

      if (resp.status >= 400) {
        lastError = `HTTP ${resp.status}: ${text.slice(0, 160)}`;
        continue;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        lastError = `响应不是 JSON: ${text.slice(0, 160)}`;
        continue;
      }

      if (!Array.isArray(data) || !data.length) {
        lastError = "接口返回空数据，请检查账号是否绑定户号";
        continue;
      }

      ctx.storage.setJSON("sgcc_bill_all", { data, time: Date.now(), source: url });
      ctx.storage.delete("sgcc_widget_error");

      ctx.notify({
        title: "网上国网",
        body: `同步成功（${data.length} 个户号）`,
      });
      return;
    } catch (e) {
      lastError = e.message || String(e);
    }
  }

  ctx.storage.setJSON("sgcc_widget_error", {
    message: lastError || "同步失败",
    time: Date.now(),
  });

  ctx.notify({
    title: "网上国网",
    body: lastError || "同步失败，请检查模块账号与 MITM",
  });
}
