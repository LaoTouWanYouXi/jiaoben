// KK键盘 稳定解锁版 - 避免崩溃
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // 基础次数解锁
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;
    if (data.leftCount !== undefined) data.leftCount = 999;

    // VIP 核心字段（保守处理）
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
    }

    if (data.user_info && data.user_info.user_vip_info) {
        data.user_info.user_vip_info.user_type = 2;
        data.user_info.user_vip_info.vip_expired_time = 9999999999;
        data.user_info.user_vip_info.not_ad_vip_expired_time = 9999999999;
    }

    // 通用字段
    data.isVip = 1;
    data.vip = 1;
    data.vipLevel = 2;
    data.vipExpire = 9999999999;
    data.not_ad_vip_expired_time = 9999999999;

    // 列表类接口处理
    if (data.vip_use !== undefined) data.vip_use = 1;
    if (data.vvip_use !== undefined) data.vvip_use = 1;

    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.vip_use !== undefined) item.vip_use = 1;
            if (item.vvip_use !== undefined) item.vvip_use = 1;
            if (Array.isArray(item.list)) {
                item.list.forEach(sub => {
                    if (sub.vip_use !== undefined) sub.vip_use = 1;
                    if (sub.vvip_use !== undefined) sub.vvip_use = 1;
                });
            }
        });
    }
}

$done({ body: JSON.stringify(obj) });
