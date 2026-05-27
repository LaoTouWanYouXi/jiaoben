// KK键盘 - 次数 + VIP加强版
let body = $response.body;
let obj = JSON.parse(body);

if (obj && obj.data) {
    let data = obj.data;

    // 次数恢复
    if (data.totalCount !== undefined) data.totalCount = 999;
    if (data.currCount !== undefined) data.currCount = 999;
    if (data.freeCount !== undefined) data.freeCount = 999;
    if (data.leftCount !== undefined) data.leftCount = 999;

    // VIP 强力注入
    if (data.user_vip_info) {
        data.user_vip_info.user_type = 2;
        data.user_vip_info.vip_expired_time = 9999999999;
        data.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 顶级字段强刷
    data.isVip = 1;
    data.vip = 1;
    data.vipLevel = 2;
    data.vipExpire = 9999999999;
    data.memberExpire = 9999999999;
    data.not_ad_vip_expired_time = 9999999999;
    data.user_type = 2;
    data.vip_status = 1;
    data.is_member = 1;

    // 处理嵌套 user_info
    if (data.user_info && data.user_info.user_vip_info) {
        data.user_info.user_vip_info.user_type = 2;
        data.user_info.user_vip_info.vip_expired_time = 9999999999;
        data.user_info.user_vip_info.not_ad_vip_expired_time = 9999999999;
        data.user_info.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 列表处理
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
