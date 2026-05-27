// KK键盘 - 会员页面专攻版（强力覆盖）
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // 基础功能保持
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;

    // 语音包保持
    if (data.vip_use !== undefined) data.vip_use = 1;
    if (data.vvip_use !== undefined) data.vvip_use = 1;

    // ==================== 会员页面强力覆盖 ====================
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 暴力注入所有可能字段
    data.isVip = 1;
    data.vip = 1;
    data.vipLevel = 2;
    data.vipExpire = 9999999999;
    data.memberExpire = 9999999999;
    data.not_ad_vip_expired_time = 9999999999;
    data.user_type = 2;
    data.vip_status = 1;
    data.is_member = 1;
    data.member_status = 1;
    data.vip_type = 2;
    data.is_vip = 1;
    data.svip = 1;
    data.expire_time = 9999999999;
    data.vip_end_time = 9999999999;

    // 如果有 kkshow_user
    if (data.kkshow_user) {
        data.kkshow_user.role_id = 3;
    }
}

$done({ body: JSON.stringify(obj) });
