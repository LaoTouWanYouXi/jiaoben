// KK键盘 - 可调试版（便于定位关键字段）
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // ==================== 基础功能（保持不变） ====================
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;

    // 语音包 / 表情包通用处理
    if (data.vip_use !== undefined) data.vip_use = 1;
    if (data.vvip_use !== undefined) data.vvip_use = 1;
    if (data.ad_status !== undefined) data.ad_status = 0;

    // ==================== 会员核心字段（可逐一测试） ====================
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // === 以下是可能影响会员显示的关键字段（你可以注释掉部分测试）===
    data.isVip = 1;
    data.vip = 1;
    data.vipLevel = 1;                    // ← 会员等级
    data.vipExpire = 9999999999;
    data.memberExpire = 9999999999;
    data.not_ad_vip_expired_time = 9999999999;

    data.user_type = 1;                   // ← 可能关键
    data.vip_status = 0;
    data.is_member = 2;
    data.member_status = 2;

    // data.vip_type = 2;                 // ← 可以尝试取消注释测试
    // data.is_vip = 1;
    // data.svip = 1;

    // kkshow_user（表情包/装扮可能依赖）
    if (data.kkshow_user) {
        data.kkshow_user.role_id = 2;
    }

    // 递归处理数组和嵌套（表情包列表）
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item.vip_use !== undefined) item.vip_use = 1;
            if (item.vvip_use !== undefined) item.vvip_use = 1;
        });
    }
}

$done({ body: JSON.stringify(obj) });
