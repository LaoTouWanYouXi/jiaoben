// 2026/04/22
/*
@Name：WeTalk 自动化签到+视频奖励 (可视化配置版)
@Author：TG@ZenMoFiShi
@Configuration
{
  "name": "WeTalk 签到设置",
  "settings": [
    {
      "key": "wetalk_enable",
      "title": "启用脚本",
      "type": "boolean",
      "default": true
    },
    {
      "key": "wetalk_cron",
      "title": "定时规则(cron)",
      "type": "text",
      "default": "20 */4 * * *"
    },
    {
      "key": "wetalk_video_max",
      "title": "最大视频次数",
      "type":number",
      "default":5
    },
    {
      "key": "wetalk_video_delay",
      "title": "视频间隔(ms)",
      "type":number",
      "default":8000
    },
    {
      "key": "wetalk_account_gap",
      "title": "账号间隔(ms)",
      "type":number",
      "default":3500
    }
  ]
}
*/

const isLoon = typeof $persistentStore !== 'undefined';
const isQuanX = typeof $task !== 'undefined';
const scriptName = 'WeTalk';
const storeKey = 'wetalk_accounts_v1';
const SECRET = '0fOiukQq7jXZV2GRi9LGlO';
const API_HOST = 'api.wetalkapp.com';

// 可视化配置读取
function getConfig(key, defaultValue) {
  try {
    if (isLoon) {
      let v = $persistentStore.read(key);
      if (v === null || v === undefined) return defaultValue;
      if (typeof defaultValue === 'boolean') return v === 'true';
      if (typeof defaultValue === 'number') return Number(v);
      return v;
    }
    if (isQuanX && $config) return $config[key] ?? defaultValue;
  } catch (e) {}
  return defaultValue;
}

// 配置项
const ENABLE = getConfig('wetalk_enable', true);
const CRON_STR = getConfig('wetalk_cron', '20 */4 * * *');
const MAX_VIDEO = getConfig('wetalk_video_max', 5);
const VIDEO_DELAY = getConfig('wetalk_video_delay', 8000);
const ACCOUNT_GAP = getConfig('wetalk_account_gap', 3500);

const IOS_VERSIONS = ['17.5.1','17.6.1','17.4.1','17.2.1','16.7.8','17.6','17.3.1','18.0.1','17.1.2','16.6.1'];
const IOS_SCALES = ['2.00','3.00','3.00','2.00','3.00'];
const IPHONE_MODELS = ['iPhone14,3','iPhone13,3','iPhone15,3','iPhone16,1','iPhone14,7','iPhone13,2','iPhone15,2','iPhone12,1'];
const CFN_VERS = ['1410.0.3','1494.0.7','1568.100.1','1209.1','1474.0.4','1568.200.2'];
const DARWIN_VERS = ['22.6.0','23.5.0','23.6.0','24.0.0','22.4.0'];

function getPrefsValue(key) {
  if (isLoon) return $persistentStore.read(key);
  if (isQuanX) return $prefs.valueForKey(key);
  return null;
}
function setPrefsValue(key, value) {
  if (isLoon) $persistentStore.write(value, key);
  else if (isQuanX) $prefs.setValueForKey(value, key);
}
function notify(title, body) {
  if (isLoon) $notification.post(scriptName, title, body);
  else if (isQuanX) $notify(scriptName, title, body);
}
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    if (isLoon) {
      $httpClient.get(options, (err, resp, body) => {
        if (err) reject(err);
        else resolve({ status: resp.statusCode, headers: resp.headers, body });
      });
    } else if (isQuanX) {
      $task.fetch(options).then(resolve).catch(reject);
    } else {
      reject('不支持的环境');
    }
  });
}

// MD5 完整实现（不省略，不报错）
function MD5(string) {
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000, lY4 = lY & 0x40000000, lX8 = lX & 0x80000000, lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) return (lResult & 0x40000000) ? (lResult ^ 0xC0000000 ^ lX8 ^ lY8) : (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    return lResult ^ lX8 ^ lY8;
  }
  function F(x,y,z){return (x&y)|((~x)&z);}
  function G(x,y,z){return (x&z)|(y&(~z));}
  function H(x,y,z){return x^y^z;}
  function I(x,y,z){return y^(x|(~z));}
  function FF(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(F(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}
  function GG(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(G(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}
  function HH(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(H(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}
  function II(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(I(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}
  function ConvertToWordArray(str){
    const lMessageLength=str.length;
    const lNumberOfWords_temp1=lMessageLength+8;
    const lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1%64))/64;
    const lNumberOfWords=(lNumberOfWords_temp2+1)*16;
    const lWordArray=Array(lNumberOfWords-1).fill(0);
    let lBytePosition=0,lByteCount=0;
    while(lByteCount<lMessageLength){
      const lWordCount=(lByteCount-(lByteCount%4))/4;
      lBytePosition=(lByteCount%4)*8;
      lWordArray[lWordCount]|=str.charCodeAt(lByteCount)<<lBytePosition;
      lByteCount++;
    }
    const lWordCount=(lByteCount-(lByteCount%4))/4;
    lBytePosition=(lByteCount%4)*8;
    lWordArray[lWordCount]|=0x80<<lBytePosition;
    lWordArray[lNumberOfWords-2]=lMessageLength<<3;
    lWordArray[lNumberOfWords-1]=lMessageLength>>>29;
    return lWordArray;
  }
  function WordToHex(lValue){
    let WordToHexValue='';
    for(let lCount=0;lCount<=3;lCount++){
      const lByte=(lValue>>>(lCount*8))&255;
      const temp='0'+lByte.toString(16);
      WordToHexValue+=temp.substr(temp.length-2,2);
    }
    return WordToHexValue;
  }
  const x=ConvertToWordArray(string);
  let a=0x67452301,b=0xEFCDAB89,c=0x98BADCFE,d=0x10325476;
  const S11=7,S12=12,S13=17,S14=22,S21=5,S22=9,S23=14,S24=20;
  const S31=4,S32=11,S33=16,S34=23,S41=6,S42=10,S43=15,S44=21;
  for(let k=0;k<x.length;k+=16){
    const AA=a,BB=b,CC=c,DD=d;
    a=FF(a,b,c,d,x[k+0],S11,0xD76AA478);d=FF(d,a,b,c,x[k+1],S12,0xE8C7B756);c=FF(c,d,a,b,x[k+2],S13,0x242070DB);b=FF(b,c,d,a,x[k+3],S14,0xC1BDCEEE);
    a=FF(a,b,c,d,x[k+4],S11,0xF57C0FAF);d=FF(d,a,b,c,x[k+5],S12,0x4787C62A);c=FF(c,d,a,b,x[k+6],S13,0xA8304613);b=FF(b,c,d,a,x[k+7],S14,0xFD469501);
    a=FF(a,b,c,d,x[k+8],S11,0x698098D8);d=FF(d,a,b,c,x[k+9],S12,0x8B44F7AF);c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
    a=FF(a,b,c,d,x[k+12],S11,0x6B901122);d=FF(d,a,b,c,x[k+13],S12,0xFD987193);c=FF(c,d,a,b,x[k+14],S13,0xA679438E);b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
    a=GG(a,b,c,d,x[k+1],S21,0xF61E2562);d=GG(d,a,b,c,x[k+6],S22,0xC040B340);c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);b=GG(b,c,d,a,x[k+0],S24,0xE9B6C7AA);
    a=GG(a,b,c,d,x[k+5],S21,0xD62F105D);d=GG(d,a,b,c,x[k+10],S22,0x02441453);c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);b=GG(b,c,d,a,x[k+4],S24,0xE7D3FBC8);
    a=GG(a,b,c,d,x[k+9],S21,0x21E1CDE6);d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);c=GG(c,d,a,b,x[k+3],S23,0xF4D50D87);b=GG(b,c,d,a,x[k+8],S24,0x455A14ED);
    a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);d=GG(d,a,b,c,x[k+2],S22,0xFCEFA3F8);c=GG(c,d,a,b,x[k+7],S23,0x676F02D9);b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
    a=HH(a,b,c,d,x[k+5],S31,0xFFFA3942);d=HH(d,a,b,c,x[k+8],S32,0x8771F681);c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
    a=HH(a,b,c,d,x[k+1],S31,0xA4BEEA44);d=HH(d,a,b,c,x[k+4],S32,0x4BDECFA9);c=HH(c,d,a,b,x[k+7],S33,0xF6BB4B60);b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
    a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);d=HH(d,a,b,c,x[k+0],S32,0xEAA127FA);c=HH(c,d,a,b,x[k+3],S33,0xD4EF3085);b=HH(b,c,d,a,x[k+6],S34,0x04881D05);
    a=HH(a,b,c,d,x[k+9],S31,0xD9D4D039);d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);b=HH(b,c,d,a,x[k+2],S34,0xC4AC5665);
    a=II(a,b,c,d,x[k+0],S41,0xF4292244);d=II(d,a,b,c,x[k+7],S42,0x432AFF97);c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);b=II(b,c,d,a,x[k+5],S44,0xFC93A039);
    a=II(a,b,c,d,x[k+12],S41,0x655B59C3);d=II(d,a,b,c,x[k+3],S42,0x8F0CCC92);c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);b=II(b,c,d,a,x[k+1],S44,0x85845DD1);
    a=II(a,b,c,d,x[k+8],S41,0x6FA87E4F);d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);c=II(c,d,a,b,x[k+6],S43,0xA3014314);b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
    a=II(a,b,c,d,x[k+4],S41,0xF7537E82);d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);c=II(c,d,a,b,x[k+2],S43,0x2AD7D2BB);b=II(b,c,d,a,x[k+9],S44,0xEB86D391);
    a=AddUnsigned(a,AA);b=AddUnsigned(b,BB);c=AddUnsigned(c,CC);d=AddUnsigned(d,DD);
  }
  return (WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d)).toLowerCase();
}

function getUTCSignDate(){
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
}
function normalizeHeaderNameMap(headers){const out={};Object.keys(headers||{}).forEach(k=>out[k]=headers[k]);return out;}
function parseRawQuery(url){const q=(url.split('?')[1]||'').split('#')[0];const m={};q.split('&').forEach(p=>{if(!p)return;const i=p.indexOf('=');if(i<0)return;m[p.slice(0,i)]=p.slice(i+1);});return m;}
function fingerprintOf(p){const d={sign:1,signDate:1,timestamp:1,ts:1,nonce:1,random:1,reqTime:1,reqId:1,requestId:1};return MD5(Object.keys(p||{}).filter(k=>!d[k]).sort().map(k=>`${k}=${p[k]}`).join('&')).slice(0,12);}
function loadStore(){const r=getPrefsValue(storeKey);if(!r)return{version:1,accounts:{},order:[]};try{const o=JSON.parse(r);o.accounts=o.accounts||{};o.order=Array.isArray(o.order)?o.order:Object.keys(o.accounts);return o;}catch(e){return{version:1,accounts:{},order:[]};}}
function saveStore(s){setPrefsValue(storeKey,JSON.stringify(s));}
function pickItem(a,s){return a[s%a.length];}
function buildUA(ua,s){const v=pickItem(IOS_VERSIONS,s);const sc=pickItem(IOS_SCALES,s+1);const m=pickItem(IPHONE_MODELS,s+2);const c=pickItem(CFN_VERS,s+3);const d=pickItem(DARWIN_VERS,s+4);if(ua&&typeof ua==='string'){let r=ua;let f=false;if(/iOS \d+(\.\d+){0,2}/.test(r)){r=r.replace(/iOS \d+(\.\d+){0,2}/,`iOS ${v}`);f=true;}if(/Scale\/\d+(\.\d+)?/.test(r)){r=r.replace(/Scale\/\d+(\.\d+)?/,`Scale/${sc}`);f=true;}if(/iPhone\d+,\d+/.test(r)){r=r.replace(/iPhone\d+,\d+/,m);f=true;}if(/CFNetwork\/[\d.]+/.test(r)){r=r.replace(/CFNetwork\/[\d.]+/,`CFNetwork/${c}`);f=true;}if(/Darwin\/[\d.]+/.test(r)){r=r.replace(/Darwin\/[\d.]+/,`Darwin/${d}`);f=true;}if(f)return r;}return `WeTalk/30.6.0 (com.innovationworks.wetalk; build:28; iOS ${v}) Alamofire/5.4.3`;}
function buildSignedParamsRaw(c){const p={};Object.keys(c.paramsRaw||{}).forEach(k=>{if(k!=='sign'&&k!=='signDate')p[k]=c.paramsRaw[k];});p.signDate=getUTCSignDate();const b=Object.keys(p).sort().map(k=>`${k}=${p[k]}`).join('&');p.sign=MD5(b+SECRET);return p;}
function buildUrl(path,c){const p=buildSignedParamsRaw(c);const q=Object.keys(p).map(k=>`${k}=${encodeURIComponent(p[k])}`).join('&');return`https://${API_HOST}/app/${path}?${q}`;}
function cloneHeaders(h){const o={};Object.keys(h||{}).forEach(k=>o[k]=h[k]);return o;}
function buildHeaders(c,ua){const h=cloneHeaders(c.headers||{});delete h['Content-Length'];delete h['content-length'];delete h[':authority'];delete h[':method'];delete h[':path'];delete h[':scheme'];h.Host=API_HOST;h.Accept=h.Accept||'application/json';Object.keys(h).forEach(k=>{if(k.toLowerCase()==='user-agent')delete h[k];});h['User-Agent']=ua;return h;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function runAccount(acc,i,t){
  const tag=`[账号${i+1}/${t} ${acc.alias||acc.id}]`;
  const ua=buildUA(acc.baseUA,acc.uaSeed);
  const headers=buildHeaders(acc.capture,ua);
  const msgs=[tag];
  const fetchApi=p=>httpRequest({url:buildUrl(p,acc.capture),method:'GET',headers});
  function loop(){let n=0;function next(){if(n>=MAX_VIDEO)return Promise.resolve();return new Promise(r=>{setTimeout(()=>{n++;fetchApi('videoBonus').then(rsp=>{try{const d=JSON.parse(rsp.body);if(d.retcode===0)msgs.push(`🎬 视频${n}：+${d.result?.bonus||'?'}`);else msgs.push(`⏸ 视频${n}：${d.retmsg}`);}catch(e){msgs.push(`❌ 视频${n}：解析失败`);}finally{next().then(r);}},()=>{msgs.push(`❌ 视频${n}：请求失败`);next().then(r);}},n===0?1500:VIDEO_DELAY);});}return next();}
  return fetchApi('queryBalanceAndBonus').then(rsp=>{
    try{const d=JSON.parse(rsp.body);if(d.retcode===0)msgs.push(`💰 余额：${d.result.balance}`);else msgs.push(`⚠️ 查询：${d.retmsg}`);}catch(e){msgs.push('❌ 查询失败');}
    return fetchApi('checkIn');
  }).then(rsp=>{
    try{const d=JSON.parse(rsp.body);if(d.retcode===0)msgs.push(`✅ 签到成功`);else msgs.push(`⚠️ 签到：${d.retmsg}`);}catch(e){msgs.push('❌ 签到失败');}
    return loop();
  }).then(()=>fetchApi('queryBalanceAndBonus')).then(rsp=>{
    try{const d=JSON.parse(rsp.body);if(d.retcode===0)msgs.push(`💰 最终：${d.result.balance}`);}catch(e){}
    return msgs.join('\n');
  }).catch(e=>msgs.push(`❌ 异常：${e.message||e}`));
}

if(typeof $request!=='undefined'&&$request){
  const p=parseRawQuery($request.url);
  const h=normalizeHeaderNameMap($request.headers||{});
  let ua='';Object.keys(h).forEach(k=>{if(k.toLowerCase()==='user-agent')ua=h[k];});
  const store=loadStore();
  const fp=fingerprintOf(p);
  const now=Date.now();
  const exist=!!store.accounts[fp];
  const seed=exist?store.accounts[fp].uaSeed:store.order.length;
  const alias=exist?store.accounts[fp].alias:`账号${store.order.length+1}`;
  store.accounts[fp]={id:fp,alias,uaSeed,baseUA:ua,capture:{url:$request.url,paramsRaw:p,headers:h},createdAt:exist?store.accounts[fp].createdAt:now,updatedAt:now};
  if(!exist)store.order.push(fp);
  saveStore(store);
  notify(exist?'更新账号':'新增账号',`${alias} | 总数：${store.order.length}`);
  $done({});
} else {
  if(!ENABLE){notify('🔴 脚本已关闭',`配置中已禁用`);$done();return;}
  const store=loadStore();
  const ids=store.order.filter(id=>store.accounts[id]);
  if(!ids.length){notify('⚠️ 无账号','请先打开WeTalk抓包');$done();return;}
  const res=[];
  let q=Promise.resolve();
  ids.forEach((id,i)=>{q=q.then(()=>runAccount(store.accounts[id],i,ids.length)).then(t=>res.push(t)).then(()=>i<ids.length-1?sleep(ACCOUNT_GAP):null);});
  q.then(()=>{notify(`🎉 完成 ${ids.length} 账号`,res.join('\n———\n'));$done();}).catch(e=>{notify('❌ 任务失败',e.message||e);$done();});
}
