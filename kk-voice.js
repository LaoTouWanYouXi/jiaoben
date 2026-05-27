// KK键盘 - 精准版（只修改必要字段）
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // 1. 次数 + 基础功能
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;

    // 2. 语音包/表情包
    if (data.vip_use !== undefined) data.vip_use = 1;
    if (data.vvip_use !== undefined) data.vvip_use = 1;

    // 3. 数组处理
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.vip_use !== undefined) item.vip_use = 1;
            if (item.vvip_use !== undefined) item.vvip_use = 1;
        });
    }

    // 4. 关键VIP处理（精简到最少）
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 5. 只保留最核心的顶级字段
    data.isVip = 1;
    data.vip = 1;
    data.vipLevel = 2;
    data.not_ad_vip_expired_time = 9999999999;
}

$done({ body: JSON.stringify(obj) });
