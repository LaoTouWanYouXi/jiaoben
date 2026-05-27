// KK键盘 - 会员显示强化版（递归 + 强刷）
let body = $response.body;
let obj = JSON.parse(body);

function unlockAll(obj) {
    if (!obj || typeof obj !== 'object') return;

    // 次数
    if (obj.totalCount !== undefined) obj.totalCount = 999;
    if (obj.currCount !== undefined) obj.currCount = 999;
    if (obj.freeCount !== undefined) obj.freeCount = 999;

    // VIP 核心
    if (obj.user_vip_info) {
        obj.user_vip_info.user_type = 2;
        obj.user_vip_info.vip_expired_time = 9999999999;
        obj.user_vip_info.not_ad_vip_expired_time = 9999999999;
        obj.user_vip_info.vip_expired_time_format = "永久会员";
    }

    // 强力会员字段注入
    const vipFields = [
        'isVip', 'vip', 'is_vip', 'vip_status', 'member_status', 
        'is_member', 'vipLevel', 'user_type', 'vip_type', 'svip'
    ];
    
    vipFields.forEach(field => {
        if (obj[field] !== undefined || obj.hasOwnProperty(field)) {
            obj[field] = field.includes('Level') ? 2 : 1;
        } else {
            obj[field] = field.includes('Level') ? 2 : 1;
        }
    });

    obj.vipExpire = 9999999999;
    obj.memberExpire = 9999999999;
    obj.not_ad_vip_expired_time = 9999999999;
    obj.expire_time = 9999999999;

    // 语音包相关
    if (obj.vip_use !== undefined) obj.vip_use = 1;
    if (obj.vvip_use !== undefined) obj.vvip_use = 1;
    if (obj.ad_status !== undefined) obj.ad_status = 0;

    // 递归处理所有嵌套对象和数组
    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            unlockAll(obj[key]);
        }
    }
}

unlockAll(obj);

$done({ body: JSON.stringify(obj) });
