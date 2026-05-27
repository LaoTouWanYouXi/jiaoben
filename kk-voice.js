// KK键盘 无限变声 + VIP 全面强制解锁（激进版）
let body = $response.body;
let obj = JSON.parse(body);

if (obj.data) {
    // 强制覆盖所有可能存在的VIP字段
    if (typeof obj.data === 'object') {
        // 顶级字段
        obj.data.isVip = 1;
        obj.data.vip = 1;
        obj.data.vipLevel = 2;
        obj.data.vipExpire = 9999999999;
        obj.data.memberExpire = 9999999999;
        obj.data.not_ad_vip_expired_time = 9999999999;
        obj.data.user_type = 2;
        obj.data.vip_status = 1;
        obj.data.is_member = 1;
        obj.data.member_status = 1;
        obj.data.expire_time = 9999999999;

        // user_vip_info
        if (obj.data.user_vip_info) {
            obj.data.user_vip_info.user_type = 2;
            obj.data.user_vip_info.vip_expired_time = 9999999999;
            obj.data.user_vip_info.not_ad_vip_expired_time = 9999999999;
            obj.data.user_vip_info.vip_expired_time_format = "永久会员";
        }

        // user_info 嵌套
        if (obj.data.user_info) {
            if (obj.data.user_info.user_vip_info) {
                obj.data.user_info.user_vip_info.user_type = 2;
                obj.data.user_info.user_vip_info.vip_expired_time = 9999999999;
                obj.data.user_info.user_vip_info.not_ad_vip_expired_time = 9999999999;
                obj.data.user_info.user_vip_info.vip_expired_time_format = "永久会员";
            }
        }

        // kkshow_user
        if (obj.data.kkshow_user) {
            obj.data.kkshow_user.role_id = 3;
        }
    }

    // 处理数组类型（短语列表等）
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

    // 单层字段
    if (obj.data.vip_use !== undefined) obj.data.vip_use = 1;
    if (obj.data.vvip_use !== undefined) obj.data.vvip_use = 1;
}

$done({ body: JSON.stringify(obj) });
