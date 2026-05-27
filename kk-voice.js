// KK键盘 无限变声解锁
let body = $response.body;
let obj = JSON.parse(body);

if (obj.data) {
    // 处理 checkCount / consumeCount
    if (obj.data.totalCount !== undefined) obj.data.totalCount = 999;
    if (obj.data.currCount !== undefined) obj.data.currCount = 999;
    if (obj.data.tutorialCount !== undefined) obj.data.tutorialCount = 999;
    if (obj.data.freeCount !== undefined) obj.data.freeCount = 999;
    if (obj.data.leftCount !== undefined) obj.data.leftCount = 999;

    // VIP相关
    if (obj.data.isVip !== undefined) obj.data.isVip = 1;
    if (obj.data.vipExpire !== undefined) obj.data.vipExpire = 9999999999;
}

$done({ body: JSON.stringify(obj) });
