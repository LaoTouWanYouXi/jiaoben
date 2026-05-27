// KK键盘 - 统一VIP处理版（智能遍历）
let body = $response.body;
let obj = JSON.parse(body);

function unlockVIP(obj) {
    if (!obj) return;

    // 处理单个对象
    if (typeof obj === 'object') {
        // 次数解锁
        if (obj.totalCount !== undefined) obj.totalCount = 999;
        if (obj.currCount !== undefined) obj.currCount = 999;
        if (obj.freeCount !== undefined) obj.freeCount = 999;
        if (obj.leftCount !== undefined) obj.leftCount = 999;

        // VIP核心字段统一处理
        if (obj.user_vip_info) {
            obj.user_vip_info.user_type = 2;
            obj.user_vip_info.vip_expired_time = 9999999999;
            obj.user_vip_info.not_ad_vip_expired_time = 9999999999;
            obj.user_vip_info.vip_expired_time_format = "永久会员";
        }

        // 语音包相关
        if (obj.vip_use !== undefined) obj.vip_use = 1;
        if (obj.vvip_use !== undefined) obj.vvip_use = 1;
        if (obj.ad_status !== undefined) obj.ad_status = 0;

        // 顶级会员字段统一注入
        obj.isVip = 1;
        obj.vip = 1;
        obj.vipLevel = 2;
        obj.vipExpire = 9999999999;
        obj.memberExpire = 9999999999;
        obj.not_ad_vip_expired_time = 9999999999;
        obj.user_type = 2;
        obj.vip_status = 1;
        obj.is_member = 1;
    }

    // 处理数组（albumcatelist等）
    if (Array.isArray(obj)) {
        obj.forEach(item => unlockVIP(item));
    }

    // 处理嵌套对象
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            unlockVIP(obj[key]);
        }
    }
}

// 执行统一处理
unlockVIP(obj);

$done({ body: JSON.stringify(obj) });
