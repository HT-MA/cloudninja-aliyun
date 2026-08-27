/**
 * @file ACE ACK 题库扩充 · TDD 6 类断言验收脚本（RED baseline）
 * @description
 *   硬编码以下契约（禁止从文件推断）：
 *     N = 140; BANK_AFTER = 483; EXAM = 'ace-ack'
 *     CORE_TOPICS = ['集群生命周期','网络与Ingress','存储','工作负载',
 *                    '可靠性与弹性伸缩','安全与治理','运维与可观测']
 *     FILL_TOPICS = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS',
 *                    '专有网络VPC','云数据库RDS','容器服务ACK','云效DevOps平台']
 *     DISTRIBUTION (每域配额) / TYPE_RATIOS (每域 [单,多,判]) 精确按契约校验
 *     ABBR: life|net|store|work|hpa|sec|ops
 *     MIN_PRIMARY = 38
 *     OTHER_EXAMS = ['aca-cloud','aca-security','acp-cloud','acp-security',
 *                    'acp-devops','ace-cloud','ace-security']
 *     REGRESS_PRIMARY = { 'acp-devops': 35 }
 *
 *   6 类断言：
 *     T1 基础计数：ACK_QUESTIONS.length === 140；BANK 合并 dedupe 后 === 483
 *     T2 域分布 + 每域 单/多/判 三元组 精确命中 DISTRIBUTION / TYPE_RATIOS
 *     T3 逐题 12 小项：字段 / 类型 / id 正则 / id前缀<->module一致性 /
 *          judge 选项 / single|multi 4 选项 / answer 数组 / single|judge 1 个答案 /
 *          multi 答案升序无重复 2~4 个 / multi 解析包含 A./B./C./D. /
 *          answer 索引合法整数 / ref 含 help.aliyun.com
 *     T4 去重：内部 id 唯一；内部 normalized question+options 唯一；
 *          与旧库 343 题 overlap === 0
 *     T5 双段抽题 5 场 ace-ack：primaryCount >= 38 且每场 === 50
 *     T6 回归 7 场 other exams：每场 exactly 50；acp-devops primaryCount >= 35
 *
 *   注：acp-quiz/questions-ack.js 在 RED 阶段不存在，因此 T1 必然 FAIL。
 *   用法：node outputs/ace-ack-verify.js
 *   通过：退出码 0 并打印 "✅ PASSED 全部 6 类断言通过"
 *   失败：聚合打印全部失败项并 process.exit(1)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ============================================================
// 一、契约常量（HARD-CODED，禁止从文件推断）
// ============================================================
const N             = 140;
const BANK_AFTER    = 483;
const EXAM          = 'ace-ack';
const CORE_TOPICS   = ['集群生命周期','网络与Ingress','存储','工作负载',
                       '可靠性与弹性伸缩','安全与治理','运维与可观测'];
const FILL_TOPICS   = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS',
                       '专有网络VPC','云数据库RDS','容器服务ACK','云效DevOps平台'];
const DISTRIBUTION  = {
  '集群生命周期':20, '网络与Ingress':22, '存储':20, '工作负载':22,
  '可靠性与弹性伸缩':18, '安全与治理':18, '运维与可观测':20
};
const TYPE_RATIOS = {
  '集群生命周期':[11,6,3], '网络与Ingress':[12,7,3], '存储':[11,6,3],
  '工作负载':[12,7,3],    '可靠性与弹性伸缩':[9,6,3], '安全与治理':[9,6,3],
  '运维与可观测':[11,6,3]
};
const ABBR = {
  '集群生命周期':'life', '网络与Ingress':'net', '存储':'store',
  '工作负载':'work', '可靠性与弹性伸缩':'hpa', '安全与治理':'sec',
  '运维与可观测':'ops'
};
const ABBR_REVERSE = (() => { const r = {}; for (const k in ABBR) r[ABBR[k]] = k; return r; })();
const MIN_PRIMARY   = 38;
const OTHER_EXAMS   = ['aca-cloud','aca-security','acp-cloud','acp-security',
                       'acp-devops','ace-cloud','ace-security'];
const REGRESS_PRIMARY = { 'acp-devops': 35 };

const SECURITY_4 = ['云安全','专有网络VPC','云服务器ECS','云计算通用'];
const DEVOPS_CORE = [
  '云效DevOps平台', '容器服务ACK', '容器镜像ACR',
  'IaC与运维编排', '可观测与监控', '发布与部署策略', '微服务与服务治理'
];
const DEVOPS_FILL = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS'];
const RULES = {
  'aca-cloud':    null,
  'aca-security': SECURITY_4,
  'acp-cloud':    null,
  'acp-security': SECURITY_4,
  'acp-devops':   { primary: DEVOPS_CORE, fill: DEVOPS_FILL, minPrimary: 35 },
  'ace-cloud':    null,
  'ace-security': SECURITY_4,
  'ace-ack':      { primary: CORE_TOPICS, fill: FILL_TOPICS, minPrimary: MIN_PRIMARY }
};

const ROOT = path.resolve(__dirname, '..');

// ============================================================
// 二、工具：vm 沙箱安全加载（ACK_QUESTIONS 不存在时返回 []）
// ============================================================
function loadViaVM(relPath, varName) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    return []; // ACK 文件尚未创建时安全跳过
  }
  const rawSrc = fs.readFileSync(full, 'utf8');
  // 顶层 `const` 声明在 vm context 中不会挂到 sandbox 全局对象上，
  // 因此包一层 IIFE 并在末尾显式返回目标变量即可安全取出。
  const wrapped = '(function(){' + rawSrc + '\n; return (typeof ' + varName +
                  ' !== "undefined") ? ' + varName + ' : []; })();';
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    const result = vm.runInContext(wrapped, sandbox, { filename: full });
    return (typeof result !== 'undefined' && Array.isArray(result)) ? result : [];
  } catch (_) {
    return [];
  }
}

// ============================================================
// 三、归一化 / 去重 / 洗牌 / 双段抽题
// ============================================================
/** normalized key: 去空白 + 去中英文标点 + 小写 → question + options.join('|') */
function _strip(s) {
  return String(s || '')
    .replace(/\s+/g, '')
    .replace(/[\p{P}，。；：？！、""''【】（）《》￥…—·]/gu, '')
    .toLowerCase();
}
function normKeyQO(q) {
  return _strip(q.question) + '||' + ((q.options || []).map(_strip).join('|'));
}
/** dedupe by question.trim() */
function dedupeByQuestion(list) {
  const seen = new Set(); const r = [];
  for (const q of list) {
    const k = String(q.question || '').trim();
    if (seen.has(k)) continue;
    seen.add(k); r.push(q);
  }
  return r;
}
function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 双段抽题（与 questions-bank.js 行为等价） */
function pickForExam(all, rule) {
  if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
    const primaryPool = shuffle(all.filter(q => rule.primary.includes(q.topic)));
    const fillPool    = shuffle(all.filter(q => rule.fill.includes(q.topic)));
    const needPrimary = Math.min(rule.minPrimary || 0, primaryPool.length, 50);
    const picked = primaryPool.slice(0, needPrimary);
    const seen = new Set(picked.map(q => String(q.question || '').trim()));
    for (const q of fillPool) {
      if (picked.length >= 50) break;
      const k = String(q.question || '').trim();
      if (seen.has(k)) continue;
      seen.add(k); picked.push(q);
    }
    for (const q of shuffle(all)) {
      if (picked.length >= 50) break;
      const k = String(q.question || '').trim();
      if (seen.has(k)) continue;
      seen.add(k); picked.push(q);
    }
    return picked.slice(0, 50);
  }
  if (Array.isArray(rule)) {
    let pool = all.filter(q => rule.includes(q.topic));
    if (pool.length === 0) pool = all;
    return shuffle(pool).slice(0, 50);
  }
  return shuffle(all.slice()).slice(0, 50);
}

// ============================================================
// 四、统一 topic / type 映射（与 questions-bank.js 相同口径）
// ============================================================
const TYPE_MAP  = { single:'单选题', multi:'多选题', judge:'判断题' };
const TOPIC_MAP = {
  ECS:'云服务器ECS', OSS:'对象存储OSS', VPC:'专有网络VPC', RDS:'云数据库RDS',
  SLB:'负载均衡SLB', '安全组':'云安全', '云监控':'云计算通用', '弹性伸缩':'弹性伸缩',
  RAM:'云安全', 'NAT网关':'专有网络VPC', 快照:'云服务器ECS', CDN:'内容分发CDN'
};
function nQ(q) {
  const ca = q.correctAnswers || q.answer ||
             (q.correctAnswer != null ? [q.correctAnswer] : []);
  const rt = q.type || 'single';
  return {
    id: q.id,
    topic: q.module || TOPIC_MAP[q.topic] || q.topic || '云计算通用',
    type: TYPE_MAP[rt] || rt,
    rawType: rt,
    question: q.question,
    options: q.options,
    correctAnswers: Array.isArray(ca) ? ca : [ca],
    explanation: q.explanation,
    ref: q.ref
  };
}

// ============================================================
// 五、FAIL 宏（任一断言失败 → 记录 errors；最终若非空 process.exit(1) 并打印全部）
// ============================================================
const errors = [];
function fail(msg) { errors.push(msg); }
function hasFailed() { return errors.length > 0; }
function printErrorsAndExitIfAny() {
  if (errors.length === 0) return;
  console.log('\n❌ FAILED ' + errors.length + ' 项：');
  for (const m of errors) console.log('   - ' + m);
  process.exit(1);
}
/**
 * 分阶段执行断言块：先捕获当前错误数，执行断言体，
 * 若断言体新增了错误则打印该阶段首条 FAIL（作为 headline 便于定位）；
 * 否则由断言体自身决定是否打印 "OK" 摘要（通过 passed 参数回调）。
 * @param {string} label - 如 'T1'
 * @param {(okFn:(msg:string)=>void)=>void} body
 */
function section(label, body) {
  const before = errors.length;
  let summary = null;
  const ok = (msg) => { summary = msg; };
  body(ok);
  if (errors.length === before) {
    if (summary) console.log(summary);
  } else {
    console.log('❌ [' + label + '] 阶段首条 FAIL：' + errors[before]);
  }
}
function passT(msg) { console.log(msg); }

// ============================================================
// 六、载入各题库（用 vm 沙箱；ACK_QUESTIONS 不存在时得到 []）
// ============================================================
const BASE_QS            = loadViaVM('acp-quiz/questions-data.js',           'QUESTIONS');
const RDS_QUESTIONS      = loadViaVM('acp-quiz/questions-rds.js',            'RDS_QUESTIONS');
const EXTRA_TOPIC_QS     = loadViaVM('acp-quiz/questions-extra.js',          'EXTRA_TOPIC_QUESTIONS');
const DEVOPS_QUESTIONS   = loadViaVM('acp-quiz/questions-devops.js',         'DEVOPS_QUESTIONS');
const ACK_QUESTIONS      = loadViaVM('acp-quiz/questions-ack.js',            'ACK_QUESTIONS');

// BANK = base + rds + extra + devops + ack → 归一化 → 按 question.trim() 去重
const ALL_RAW = []
  .concat(BASE_QS)
  .concat(RDS_QUESTIONS)
  .concat(EXTRA_TOPIC_QS)
  .concat(DEVOPS_QUESTIONS)
  .concat(ACK_QUESTIONS);
const BANK = dedupeByQuestion(ALL_RAW.map(nQ));

// 旧库 343 = rds + extra + devops + base  （不含 ACK）
const OLD_RAW = []
  .concat(RDS_QUESTIONS)
  .concat(EXTRA_TOPIC_QS)
  .concat(DEVOPS_QUESTIONS)
  .concat(BASE_QS);
const OLD_BANK      = dedupeByQuestion(OLD_RAW.map(nQ));
const OLD_NORM_KEYS = new Set(OLD_BANK.map(normKeyQO));

// ============================================================
// T1 基础计数
// ============================================================
section('T1', function (ok) {
  const ackLen = Array.isArray(ACK_QUESTIONS) ? ACK_QUESTIONS.length : -1;
  if (ackLen !== N) {
    fail('[T1] ACK_QUESTIONS 题数应为 ' + N + '，实际 ' +
         (ackLen < 0 ? '非数组' : (ACK_QUESTIONS.length === 0 ? 'ACK=NA(0)' : ackLen)));
  }
  if (BANK.length !== BANK_AFTER) {
    fail('[T1] 合并去重后 BANK 应为 ' + BANK_AFTER + '，实际 ' + BANK.length);
  }
  ok('[T1] 基础计数 OK：ACK=' + ackLen + '，BANK=' + BANK.length);
});

// ============================================================
// T2 域分布 + 每域 单/多/判 三元组
// ============================================================
section('T2', function (ok) {
  const topicCount = {};
  const typeCount  = {};
  for (const mod of CORE_TOPICS) {
    topicCount[mod] = 0;
    typeCount[mod]  = { single:0, multi:0, judge:0 };
  }
  for (const q of ACK_QUESTIONS) {
    const m = q.module;
    if (!Object.prototype.hasOwnProperty.call(topicCount, m)) {
      fail('[T2] 未知 module："' + m + '"（不在 CORE_TOPICS 7 域内）id=' + q.id);
    }
    topicCount[m]++;
    typeCount[m][q.type]++;
  }
  for (const mod of CORE_TOPICS) {
    if (topicCount[mod] !== DISTRIBUTION[mod]) {
      fail('[T2] 域 ' + mod + ' 配额应为 ' + DISTRIBUTION[mod] + '，实际 ' + topicCount[mod]);
    }
    const [s, m, j] = TYPE_RATIOS[mod];
    const tc = typeCount[mod];
    if (tc.single !== s || tc.multi !== m || tc.judge !== j) {
      fail('[T2] 域 ' + mod + ' 三元组应为 [' + s + ',' + m + ',' + j + ']，实际 [' +
           tc.single + ',' + tc.multi + ',' + tc.judge + ']');
    }
    if ((s + m + j) !== DISTRIBUTION[mod]) {
      fail('[T2] 域 ' + mod + ' 三元组和(' + (s+m+j) + ') != DISTRIBUTION(' + DISTRIBUTION[mod] + ')');
    }
  }
  ok('[T2] 7 主域分布 + 三元组精确命中：' +
    CORE_TOPICS.map(t => (ABBR[t] + '=' + topicCount[t] + ':' +
      TYPE_RATIOS[t].join('/'))).join('  '));
});

// ============================================================
// T3 逐题 12 小项
// ============================================================
section('T3', function (ok) {
  const TYPE_SET = new Set(['single','multi','judge']);
  const ID_RE    = /^aceack_(life|net|store|work|hpa|sec|ops)\d{2}$/;
  const ABD_RE   = /A\.[\s\S]*B\.[\s\S]*C\.[\s\S]*D\./i;

  for (let i = 0; i < ACK_QUESTIONS.length; i++) {
    const q = ACK_QUESTIONS[i];
    const tag = 'id=' + (q ? q.id : ('<idx#' + i + '>'));

    if (!q || typeof q !== 'object') fail('[T3] ACK[' + i + '] 不是对象 (' + tag + ')');

    // T3.1 8 字段齐全
    for (const f of ['id','module','type','question','options','answer','explanation','ref']) {
      if (!Object.prototype.hasOwnProperty.call(q, f)) {
        fail('[T3.1] ' + tag + ' 缺少字段 ' + f);
      }
    }

    // T3.2 type ∈ {single,multi,judge}
    if (!TYPE_SET.has(q.type)) fail('[T3.2] ' + tag + ' type="' + q.type + '" 非法');

    // T3.3 id 正则：aceack_(life|net|store|work|hpa|sec|ops)\d{2}
    if (typeof q.id !== 'string' || !ID_RE.test(q.id)) {
      fail('[T3.3] ' + tag + ' id 正则不匹配 (必须 ^aceack_(life|net|store|work|hpa|sec|ops)\\d{2}$)');
    }

    // T3.4 id 前缀 ↔ module 一致性
    const m = q.id.match(ID_RE);
    if (m) {
      const expected = ABBR_REVERSE[m[1]];
      if (q.module !== expected) {
        fail('[T3.4] ' + tag + ' id 前缀 ' + m[1] + ' 对应 module 应为 "' + expected +
             '"，实际 "' + q.module + '"');
      }
    }

    // T3.5 judge: options === ['正确','错误']，长度 2
    if (q.type === 'judge') {
      if (!Array.isArray(q.options) || q.options.length !== 2) {
        fail('[T3.5] ' + tag + ' judge options.length 应为 2，实际 ' + (q.options ? q.options.length : 'NA'));
      }
      if (q.options[0] !== '正确' || q.options[1] !== '错误') {
        fail('[T3.5] ' + tag + ' judge 选项字节级必须为 ["正确","错误"]，实际 ' + JSON.stringify(q.options));
      }
    }

    // T3.6 single/multi: options.length === 4
    if (q.type === 'single' || q.type === 'multi') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        fail('[T3.6] ' + tag + ' ' + q.type + ' options.length 应为 4，实际 ' +
             (q.options ? q.options.length : 'NA'));
      }
    }

    // T3.7 answer 必须是数组且 length>=1
    if (!Array.isArray(q.answer) || q.answer.length < 1) {
      fail('[T3.7] ' + tag + ' answer 应为非空数组，实际 ' + JSON.stringify(q.answer));
    }

    // T3.8 single/judge answer.length === 1
    if (q.type === 'single' || q.type === 'judge') {
      if (q.answer.length !== 1) {
        fail('[T3.8] ' + tag + ' ' + q.type + ' answer.length 应为 1，实际 ' + q.answer.length);
      }
    }

    // T3.9 multi answer 升序无重复，长度 2~4
    if (q.type === 'multi') {
      if (q.answer.length < 2 || q.answer.length > 4) {
        fail('[T3.9] ' + tag + ' multi answer.length 应为 2~4，实际 ' + q.answer.length);
      }
      const a = q.answer.slice().sort((x,y) => x - y);
      if (a.join(',') !== q.answer.join(',')) {
        fail('[T3.9] ' + tag + ' multi answer 必须升序，实际 ' + JSON.stringify(q.answer) +
             '，期望 ' + JSON.stringify(a));
      }
      if ((new Set(q.answer)).size !== q.answer.length) {
        fail('[T3.9] ' + tag + ' multi answer 有重复：' + JSON.stringify(q.answer));
      }
    }

    // T3.10 multi explanation 必须包含 A. ... B. ... C. ... D.
    if (q.type === 'multi') {
      const ex = String(q.explanation || '');
      if (!ABD_RE.test(ex)) {
        fail('[T3.10] ' + tag + ' multi explanation 必须包含 A.、B.、C.、D. 四段解析，实际：' +
             ex.slice(0, 120));
      }
    }

    // T3.11 answer 元素：整数且 0<=idx<options.length
    for (const a of q.answer) {
      if (!Number.isInteger(a) || a < 0 || a >= q.options.length) {
        fail('[T3.11] ' + tag + ' answer 元素越界或非整数：' + a +
             '（options.length=' + q.options.length + '）');
      }
    }

    // T3.12 ref 若非空必须包含 help.aliyun.com
    if (q.ref != null && String(q.ref).trim() !== '') {
      if (!/help\.aliyun\.com/i.test(String(q.ref))) {
        fail('[T3.12] ' + tag + ' ref 非空但不含 help.aliyun.com，实际 "' + q.ref + '"');
      }
    }
  }
  ok('[T3] 字段/索引/格式 12 小项全通过：' + ACK_QUESTIONS.length + '/' + N);
});

// ============================================================
// T4 去重（3 项）
// ============================================================
section('T4', function (ok) {
  // T4.1 内部 id 唯一
  const ids = new Set();
  for (const q of ACK_QUESTIONS) {
    if (ids.has(q.id)) fail('[T4.1] 内部 id 重复：' + q.id);
    ids.add(q.id);
  }

  // T4.2 内部 normalized question+options 唯一
  const qk = new Set();
  for (const q of ACK_QUESTIONS) {
    const k = normKeyQO(q);
    if (qk.has(k)) fail('[T4.2] 内部 question+options 重复：id=' + q.id);
    qk.add(k);
  }

  // T4.3 与旧库 343 题 overlap = 0（打印前 10 条重叠题干）
  const overlaps = [];
  for (const q of ACK_QUESTIONS) {
    const k = normKeyQO(q);
    if (OLD_NORM_KEYS.has(k)) {
      overlaps.push(q);
      if (overlaps.length >= 10) break;
    }
  }
  if (overlaps.length > 0) {
    const preview = overlaps.map((q, i) =>
      '   [' + (i+1) + '] id=' + q.id + ' 题干=' + String(q.question||'').slice(0, 80)
    ).join('\n');
    fail('[T4.3] 与旧库 343 题 overlap 非 0，至少 ' + overlaps.length + ' 条：\n' + preview);
  }
  ok('[T4] 去重 OK：内部 id 0 重复 / 内部 q+o 0 重复 / 与旧库 overlap=0');
});

// ============================================================
// T5 双段抽题：5 场 ace-ack，每场 primaryCount >= 38 且 length === 50
// ============================================================
section('T5', function (ok) {
  const rule = RULES['ace-ack'];
  for (let i = 1; i <= 5; i++) {
    const b1 = errors.length;
    const paper = pickForExam(BANK, rule);
    if (paper.length !== 50) {
      fail('[T5-' + i + '] ace-ack 抽题数量应为 50，实际 ' + paper.length);
    }
    const pCount = paper.filter(q => CORE_TOPICS.includes(q.topic)).length;
    if (pCount < MIN_PRIMARY) {
      fail('[T5-' + i + '] ace-ack primaryCount=' + pCount + ' < ' + MIN_PRIMARY + ' (下限)');
    }
    const uniq = new Set(paper.map(q => String(q.question || '').trim())).size;
    if (uniq !== paper.length) {
      fail('[T5-' + i + '] 同一场存在重复题干：uniq=' + uniq + ' != 50');
    }
    if (errors.length === b1) {
      console.log('[T5-' + i + '] ace-ack 试卷 OK：primary=' + pCount + '/50（≥' + MIN_PRIMARY + '）');
    }
  }
  ok('[T5] 5× ace-ack 双段抽题断言全部落地');
});

// ============================================================
// T6 回归：7 场 OTHER_EXAMS，每场 exactly 50；acp-devops primary >= 35
// ============================================================
section('T6', function (ok) {
  for (const code of OTHER_EXAMS) {
    const b1 = errors.length;
    const rule = RULES[code];
    const paper = pickForExam(BANK, rule);
    if (paper.length !== 50) {
      fail('[T6] ' + code + ' 抽题数量应为 50，实际 ' + paper.length);
    }
    let pCountInfo = '';
    if (Object.prototype.hasOwnProperty.call(REGRESS_PRIMARY, code)) {
      const ruleObj = rule;
      if (ruleObj && typeof ruleObj === 'object' && !Array.isArray(ruleObj) &&
          Array.isArray(ruleObj.primary)) {
        const pCount = paper.filter(q => ruleObj.primary.includes(q.topic)).length;
        const min = REGRESS_PRIMARY[code];
        if (pCount < min) {
          fail('[T6] ' + code + ' primaryCount=' + pCount + ' < ' + min + ' (回归下限)');
        }
        pCountInfo = '，primary=' + pCount + '（≥' + min + '）';
      }
    }
    if (errors.length === b1) {
      console.log('[T6] ' + code + ' 抽题 OK：length=' + paper.length + pCountInfo);
    }
  }
  ok('[T6] 7× 既有考试方向回归断言全部落地');
});

// ============================================================
// 全部通过 / 失败汇总
// ============================================================
printErrorsAndExitIfAny();
console.log('\n✅ PASSED 全部 6 类断言通过');
process.exit(0);
