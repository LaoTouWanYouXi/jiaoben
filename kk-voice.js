// KK键盘 无限变声 + VIP 解锁（加强版）
let body = $response.body;
let obj = JSON.parse(body);

if (obj.data) {
    // ==================== 次数相关 ====================
    if (obj.data.totalCount !== undefined) obj.data.totalCount = 999;
    if (obj.data.currCount !== undefined) obj.data.currCount = 999;
    if (obj.data.tutorialCount !== undefined) obj.data.tutorialCount = 999;
    if (obj.data.freeCount !== undefined) obj.data.freeCount = 999;
    if (obj.data.leftCount !== undefined) obj.data.leftCount = 999;

    // ==================== VIP 解锁（关键修改）===================
    if (obj.data.user_vip_info) {
        obj.data.user_vip_info.user_type = 2;           // 改为高级会员
        obj.data.user_vip_info.vip_expired_time = 9999999999;
        obj.data.user_vip_info.not_ad_vip_expired_time = 9999999999;
    }

    // 通用VIP字段加强
    obj.data.isVip = 1;
    obj.data.vip = 1;
    obj.data.vipLevel = 2;
    obj.data.vipExpire = 9999999999;
    obj.data.memberExpire = 9999999999;
    obj.data.expireTime = 9999999999;
    obj.data.not_ad_vip_expired_time = 9999999999;
}

$done({ body: JSON.stringify(obj) });
