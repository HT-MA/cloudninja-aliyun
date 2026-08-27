/* ============================================================
 * 云忍者 — 统一题库加载器
 * 合并 questions-data.js 与 quiz.html 内联精选题，统一格式：
 * correctAnswers 数组、中文题型名、topic 字段，并按题目文本去重，
 * 避免同一场考试出现内容完全相同的重复题。
 * ============================================================ */

const TYPE_MAP = { 'single': '单选题', 'multi': '多选题', 'judge': '判断题' };

const TOPIC_MAP = {
    'ECS': '云服务器ECS', 'OSS': '对象存储OSS', 'VPC': '专有网络VPC',
    'RDS': '云数据库RDS', 'SLB': '负载均衡SLB', '安全组': '云安全',
    '云监控': '云计算通用', '弹性伸缩': '弹性伸缩', 'RAM': '云安全',
    'NAT网关': '专有网络VPC', '快照': '云服务器ECS', 'CDN': '内容分发CDN'
};

function normalizeQ(q, prefix) {
    const correctAnswers = q.correctAnswers || q.answer || [q.correctAnswer];
    const rawType = q.type || 'single';
    return {
        id: prefix ? prefix + '_' + q.id : q.id,
        topic: q.module || TOPIC_MAP[q.topic] || q.topic || '云计算通用',
        difficulty: q.difficulty || (rawType === 'multi' ? '中等' : '简单'),
        type: TYPE_MAP[rawType] || rawType,
        question: q.question,
        options: q.options,
        correctAnswers: correctAnswers,
        explanation: q.explanation,
        ref: q.ref
    };
}

/* 按题目文本去重（保留先出现的题目），防止重复题进入同一场考试 */
function dedupeQuestions(list) {
    const seen = new Set();
    const result = [];
    for (const q of list) {
        const key = q.question.trim();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(q);
    }
    return result;
}

/* RDS、扩展考点、ACP DevOps 专属题库为独立文件，合并进全局题库 */
const EXTRA_QUESTIONS = []
    .concat((typeof RDS_QUESTIONS         !== 'undefined') ? RDS_QUESTIONS         : [])
    .concat((typeof EXTRA_TOPIC_QUESTIONS !== 'undefined') ? EXTRA_TOPIC_QUESTIONS : [])
    .concat((typeof DEVOPS_QUESTIONS      !== 'undefined') ? DEVOPS_QUESTIONS      : [])
    .concat((typeof ACK_QUESTIONS         !== 'undefined') ? ACK_QUESTIONS         : []);

/* ACP DevOps 双段过滤配置：7 大核心域优先抽 minPrimary 题，不足再用云基础设施域补齐 */
const DEVOPS_CORE_TOPICS = [
    '云效DevOps平台', '容器服务ACK', '容器镜像ACR',
    'IaC与运维编排', '可观测与监控', '发布与部署策略', '微服务与服务治理'
];
const DEVOPS_FILL_TOPICS = ['弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS'];

/* ACE ACK 双段过滤配置：7 大核心域优先抽 minPrimary 题，不足再用云基础设施域补齐 */
const ACK_CORE_TOPICS = ['集群生命周期','网络与Ingress','存储','工作负载','可靠性与弹性伸缩','安全与治理','运维与可观测'];
const ACK_FILL_TOPICS = ['弹性伸缩','负载均衡SLB','云计算通用','云服务器ECS','专有网络VPC','云数据库RDS','容器服务ACK','云效DevOps平台'];

const QUESTION_BANK = dedupeQuestions(
    EXTRA_QUESTIONS.concat(QUESTIONS).map(q => normalizeQ(q))
);

const EXAM_MODULES = {
    'aca-cloud':       null,
    'aca-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-cloud':       null,
    'acp-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-devops':      { primary: DEVOPS_CORE_TOPICS, fill: DEVOPS_FILL_TOPICS, minPrimary: 35 },
    'ace-cloud':       null,
    'ace-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用']
};
EXAM_MODULES['ace-ack'] = {
  primary: ACK_CORE_TOPICS,
  fill: ACK_FILL_TOPICS,
  minPrimary: 38
};

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getQuestionsForExam(examCode, extraQuestions) {
    const all = dedupeQuestions([
        ...(extraQuestions || []).map(q => normalizeQ(q)),
        ...QUESTION_BANK
    ]);
    const rule = EXAM_MODULES[examCode];

    /* 分支 A：对象格式（双段优先，当前 acp-devops 采用） */
    if (rule && typeof rule === 'object' && !Array.isArray(rule)) {
        const primaryPool = shuffleArray(all.filter(q => rule.primary.includes(q.topic)));
        const fillPool    = shuffleArray(all.filter(q => rule.fill.includes(q.topic)));
        const needPrimary = Math.min(rule.minPrimary || 0, primaryPool.length, 50);
        const picked = primaryPool.slice(0, needPrimary);
        const seen = new Set(picked.map(q => q.question.trim()));
        for (const q of fillPool) {
            if (picked.length >= 50) break;
            const k = q.question.trim();
            if (seen.has(k)) continue;
            seen.add(k); picked.push(q);
        }
        /* 终极兜底（题库规模极小时，从全库去重补至 50） */
        for (const q of shuffleArray(all.slice())) {
            if (picked.length >= 50) break;
            const k = q.question.trim();
            if (seen.has(k)) continue;
            seen.add(k); picked.push(q);
        }
        return picked.slice(0, 50);
    }

    /* 分支 B：数组（单段白名单过滤，沿用原行为） */
    if (Array.isArray(rule)) {
        let pool = all.filter(q => rule.includes(q.topic));
        if (pool.length === 0) pool = all;
        shuffleArray(pool);
        return pool.slice(0, Math.min(50, pool.length));
    }

    /* 分支 C：null（全库随机抽取） */
    return shuffleArray(all.slice()).slice(0, 50);
}
