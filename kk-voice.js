// KK键盘 无限变声 + VIP 全面解锁（会员页面重点优化）
let body = $response.body;
let obj = JSON.parse(body);

if (obj.data) {
    // ==================== 次数相关 ====================
    if (obj.data.totalCount !== undefined) obj.data.totalCount = 999;
    if (obj.data.currCount !== undefined) obj.data.currCount = 999;
    if (obj.data.tutorialCount !== undefined) obj.data.tutorialCount = 999;
    if (obj.data.freeCount !== undefined) obj.data.freeCount = 999;
    if (obj.data.leftCount !== undefined) obj.data.leftCount = 999;

    // ==================== VIP 核心解锁（加强版）===================
    // user_vip_info
    if (obj.data.user_vip_info) {
        obj.data.user_vip_info.user_type = 2;
        obj.data.user_vip_info.vip_expired_time = 9999999999;
        obj.data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        obj.data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // kkshow_user（可能影响会员显示）
    if (obj.data.kkshow_user) {
        obj.data.kkshow_user.role_id = 2;        // 提升角色等级
    }

    // 顶级字段加强（会员页面最依赖）
    obj.data.isVip = 1;
    obj.data.vip = 1;
    obj.data.vipLevel = 2;
    obj.data.vipExpire = 9999999999;
    obj.data.memberExpire = 9999999999;
    obj.data.not_ad_vip_expired_time = 9999999999;
    
    // 额外常用字段
    obj.data.user_type = 2;
    obj.data.vip_status = 1;
    obj.data.is_member = 1;
    obj.data.member_status = 1;
    obj.data.expire_time = 9999999999;

    // 处理 user_info 嵌套情况
    if (obj.data.user_info && obj.data.user_info.user_vip_info) {
        obj.data.user_info.user_vip_info.user_type = 2;
        obj.data.user_info.user_vip_info.vip_expired_time = 9999999999;
        obj.data.user_info.user_vip_info.not_ad_vip_expired_time = 9999999999;
        obj.data.user_info.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // pvoiceDetail & albumcatelist
    if (obj.data.vip_use !== undefined) obj.data.vip_use = 1;
    if (obj.data.vvip_use !== undefined) obj.data.vvip_use = 1;

    // 数组类型处理（albumcatelist等）
    if (Array.isArray(obj.data)) {
        obj.data.forEach(item => {
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
