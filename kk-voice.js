// KK键盘 - profile接口最终加强版
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // 次数
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;

    // ==================== 重点加强 profile VIP ====================
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 顶级字段暴力覆盖
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

    // 额外尝试字段（App可能依赖这些）
    data.vip_type = 2;
    data.is_vip = 1;
    data.member = 1;
    data.svip = 1;
    data.expire = 9999999999;
    data.vip_end_time = 9999999999;

    // kkshow_user 角色提升
    if (data.kkshow_user) {
        data.kkshow_user.role_id = 3;
    }
}

$done({ body: JSON.stringify(obj) });
