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

const QUESTION_BANK = dedupeQuestions(QUESTIONS.map(q => normalizeQ(q)));

const EXAM_MODULES = {
    'aca-cloud':       null,
    'aca-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-cloud':       null,
    'acp-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用'],
    'acp-devops':      ['弹性伸缩', '负载均衡SLB', '云计算通用', '云服务器ECS'],
    'ace-cloud':       null,
    'ace-security':    ['云安全', '专有网络VPC', '云服务器ECS', '云计算通用']
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
    const modules = EXAM_MODULES[examCode];
    let pool = modules ? all.filter(q => modules.includes(q.topic)) : all;
    if (pool.length === 0) pool = all;
    shuffleArray(pool);
    return pool.slice(0, Math.min(50, pool.length));
}
