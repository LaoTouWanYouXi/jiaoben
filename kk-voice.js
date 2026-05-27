// KK键盘 无限变声 + VIP 全面解锁（最新加强版）
let body = $response.body;
let obj = JSON.parse(body);

if (obj.data) {
    // ==================== 次数相关 ====================
    if (obj.data.totalCount !== undefined) obj.data.totalCount = 999;
    if (obj.data.currCount !== undefined) obj.data.currCount = 999;
    if (obj.data.tutorialCount !== undefined) obj.data.tutorialCount = 999;
    if (obj.data.freeCount !== undefined) obj.data.freeCount = 999;
    if (obj.data.leftCount !== undefined) obj.data.leftCount = 999;

    // ==================== VIP 核心解锁 ====================
    if (obj.data.user_vip_info) {
        obj.data.user_vip_info.user_type = 2;
        obj.data.user_vip_info.vip_expired_time = 9999999999;
        obj.data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        obj.data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    if (obj.data.user_info && obj.data.user_info.user_vip_info) {
        obj.data.user_info.user_vip_info.user_type = 2;
        obj.data.user_info.user_vip_info.vip_expired_time = 9999999999;
        obj.data.user_info.user_vip_info.not_ad_vip_expired_time = 9999999999;
        obj.data.user_info.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // pvoiceDetail 处理
    if (obj.data.vip_use !== undefined) obj.data.vip_use = 1;
    if (obj.data.user && obj.data.user.user_vip_info) {
        obj.data.user.user_vip_info.user_type = 2;
        obj.data.user.user_vip_info.vip_expired_time = 9999999999;
        obj.data.user.user_vip_info.not_ad_vip_expired_time = 9999999999;
    }

    // goodslist 处理
    if (obj.data.is_subscribe !== undefined) obj.data.is_subscribe = 1;
    if (obj.data.is_show !== undefined) obj.data.is_show = false;
    if (obj.data.is_show_oneday_vip !== undefined) obj.data.is_show_oneday_vip = false;

    // ==================== 新增：albumcatelist（短语/专辑列表）处理 ====================
    if (Array.isArray(obj.data)) {
        obj.data.forEach(item => {
            if (item.vip_use !== undefined) item.vip_use = 1;
            if (item.vvip_use !== undefined) item.vvip_use = 1;
            
            // 处理 list 数组（里面也有vip_use）
            if (Array.isArray(item.list)) {
                item.list.forEach(subItem => {
                    if (subItem.vip_use !== undefined) subItem.vip_use = 1;
                    if (subItem.vvip_use !== undefined) subItem.vvip_use = 1;
                });
            }
        });
    }

    // 通用VIP加强
    obj.data.isVip = 1;
    obj.data.vip = 1;
    obj.data.vipLevel = 2;
    obj.data.vipExpire = 9999999999;
    obj.data.memberExpire = 9999999999;
    obj.data.not_ad_vip_expired_time = 9999999999;
}

$done({ body: JSON.stringify(obj) });
