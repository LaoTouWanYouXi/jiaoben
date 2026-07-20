/**
 * 网上国网数据同步（Egern）
 *
 * GitHub:
 * https://raw.githubusercontent.com/LaoTouWanYouXi/jiaoben/refs/heads/main/SGCC_Sync.js
 *
 * 用途：定时或手动拉取电费数据，写入 ctx.storage 供小组件读取。
 * 建议：启用 SGCC_Egern.sgmodule 后，手动运行一次本脚本测试。
 *
 * 说明：
 * - 只请求余额 + 日/月用电，跳过阶梯电量(stepElecQuantity)，减少报错
 * - 账单基础信息为空时仍会缓存可用用电量，不强行判失败
 */

const QUERY =
  "eleBill=1&dayElecQuantity=1&dayElecQuantity31=1&monthElecQuantity=1";

const API_CANDIDATES = [
  `http://api.wsgw-rewrite.com/electricity/bill/all?${QUERY}`,
  `https://api.wsgw-rewrite.com/electricity/bill/all?${QUERY}`,
];

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

function summarize(list) {
  const tips = [];
  list.forEach((info, i) => {
    const name =
      info?.userInfo?.consName_dst ||
      info?.userInfo?.consNo_dst ||
      `户号${i}`;
    if (!hasBalance(info)) tips.push(`${i}:${name}账单基础信息空`);
    if (!hasUsage(info)) tips.push(`${i}:${name}用电量空`);
  });
  return tips;
}

export default async function (ctx) {
  let lastError = null;

  for (const url of API_CANDIDATES) {
    try {
      const resp = await ctx.http.get(url, { timeout: 55 });
      const text = await resp.text();

      // 服务模式偶发用 400 包一层业务结果，尽量解析 body
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        if (resp.status >= 400) {
          lastError = `HTTP ${resp.status}: ${text.slice(0, 160)}`;
          continue;
        }
        lastError = `响应不是 JSON: ${text.slice(0, 160)}`;
        continue;
      }

      // 兼容 { data: [...] } / 直接数组 / 单对象
      if (data && !Array.isArray(data) && Array.isArray(data.data)) {
        data = data.data;
      }
      if (data && !Array.isArray(data) && typeof data === "object") {
        data = [data];
      }

      if (!Array.isArray(data) || !data.length) {
        lastError =
          resp.status >= 400
            ? `HTTP ${resp.status}: 接口无户号数据`
            : "接口返回空数据，请检查账号是否绑定户号";
        continue;
      }

      const useful = data.some(
        (info) => hasBalance(info) || hasUsage(info) || info?.userInfo
      );
      if (!useful) {
        lastError = "户号数据均为空，请稍后重试或检查国网登录态";
        continue;
      }

      const warnings = summarize(data);
      ctx.storage.setJSON("sgcc_bill_all", {
        data,
        time: Date.now(),
        source: url,
        warnings,
      });
      ctx.storage.delete("sgcc_widget_error");

      const warnText = warnings.length ? `；注意：${warnings.join("，")}` : "";
      ctx.notify({
        title: "网上国网",
        body: `同步成功（${data.length} 个户号）${warnText}`,
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
