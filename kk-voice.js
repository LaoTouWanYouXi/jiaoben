// KK键盘 - 稳定版 + profile重点优化
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // 次数解锁
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;
    if (data.leftCount !== undefined) data.leftCount = 999;

    // ==================== 重点：profile 接口 VIP 处理 ====================
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 顶级会员字段强刷
    data.isVip = 1;
    data.vip = 1;
    data.vipLevel = 2;
    data.vipExpire = 9999999999;
    data.memberExpire = 9999999999;
    data.not_ad_vip_expired_time = 9999999999;
    data.user_type = 2;

    // 其他可能字段
    data.vip_status = 1;
    data.is_member = 1;
    data.member_status = 1;

    // 处理嵌套情况
    if (data.user_info && data.user_info.user_vip_info) {
        data.user_info.user_vip_info.user_type = 2;
        data.user_info.user_vip_info.vip_expired_time = 9999999999;
        data.user_info.user_vip_info.not_ad_vip_expired_time = 9999999999;
    }

    // 列表处理
    if (data.vip_use !== undefined) data.vip_use = 1;
    if (data.vvip_use !== undefined) data.vvip_use = 1;
}

$done({ body: JSON.stringify(obj) });
