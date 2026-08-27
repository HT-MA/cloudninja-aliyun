// ===== Shared Navigation & Footer =====
// This file is loaded on every page to inject the nav and footer

// Apply saved theme before anything renders (only if not already set by inline head script)
(function() {
    if (document.documentElement.getAttribute('data-theme')) return;
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();

// Global theme toggle function (callable from inline onclick)
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

// Fallback: directly inject light theme CSS variables (bypasses any CSS caching issues)
const LIGHT_CSS = `
[data-theme="light"] {
    --bg-0: #f5f7fa !important;
    --bg-1: #ffffff !important;
    --bg-2: #eef2f7 !important;
    --bg-3: #e2e8f0 !important;
    --border: rgba(0,0,0,0.08) !important;
    --border-hi: rgba(0,153,204,0.25) !important;
    --accent: #0090b8 !important;
    --accent-dim: rgba(0,144,184,0.1) !important;
    --accent-glow: rgba(0,144,184,0.3) !important;
    --warm: #d96500 !important;
    --warm-dim: rgba(217,101,0,0.1) !important;
    --green: #00a060 !important;
    --red: #e0406a !important;
    --red-dim: rgba(224,64,106,0.08) !important;
    --text-0: #1a202c !important;
    --text-1: #4a5568 !important;
    --text-2: #718096 !important;
    --text-3: #a0aec0 !important;
    --nav-bg: rgba(255,255,255,0.8) !important;
    --option-bg: rgba(0,0,0,0.02) !important;
}
[data-theme="light"] .bg-grid {
    background-image:
        linear-gradient(rgba(0,144,184,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,144,184,0.04) 1px, transparent 1px) !important;
}
[data-theme="light"] .bg-glow {
    background:
        radial-gradient(ellipse 600px 400px at 15% 10%, rgba(0,144,184,0.06), transparent),
        radial-gradient(ellipse 500px 500px at 85% 70%, rgba(217,101,0,0.04), transparent) !important;
}
[data-theme="light"] .hero-bg {
    background:
        radial-gradient(ellipse 700px 500px at 20% 40%, rgba(0,144,184,0.08), transparent 60%),
        radial-gradient(ellipse 500px 400px at 80% 30%, rgba(217,101,0,0.04), transparent 60%) !important;
}
[data-theme="light"] .page-header-bg {
    background:
        radial-gradient(ellipse 600px 400px at 30% 50%, rgba(0,144,184,0.06), transparent 60%),
        radial-gradient(ellipse 400px 300px at 80% 30%, rgba(217,101,0,0.03), transparent 60%) !important;
}
[data-theme="light"] .quiz-explanation { background: rgba(0,144,184,0.05) !important; }
[data-theme="light"] .logo-text {
    background: linear-gradient(90deg, var(--text-0), var(--accent)) !important;
    -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important;
}
[data-theme="light"] .hero h1 .accent {
    background: linear-gradient(135deg, var(--accent), #0066cc) !important;
    -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important;
}
[data-theme="light"] .hero-stat .num,
[data-theme="light"] .qotd-date .day,
[data-theme="light"] .quiz-results .score-number {
    background: linear-gradient(135deg, var(--accent), #0066cc) !important;
    -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important;
}
[data-theme="light"] .quiz-progress-fill { background: linear-gradient(90deg, var(--accent), #0066cc) !important; }
[data-theme="light"] .domain-bar-fill { background: linear-gradient(90deg, var(--accent), #0066cc) !important; }
[data-theme="light"] .theme-toggle .icon-sun { display: block !important; }
[data-theme="light"] .theme-toggle .icon-moon { display: none !important; }
`;
const styleEl = document.createElement('style');
styleEl.textContent = LIGHT_CSS;
document.head.appendChild(styleEl);

const navHTML = `
<div class="nav-inner">
    <a href="index.html" class="logo">
        <div class="logo-icon">⚡</div>
        <div>
            <div class="logo-text">云忍者</div>
            <div class="logo-sub">CloudNinja.cn</div>
        </div>
    </a>
    <div class="nav-links" id="navLinks">
        <a href="index.html">首页</a>
        <a href="practice.html">模拟考试</a>
        <a href="certifications.html">认证指南</a>
        <a href="index.html#qotd">每日一题</a>
        <a href="game.html">学习游戏</a>
        <a href="about.html">关于</a>
        <a href="practice.html" class="nav-cta">开始练习</a>
    </div>
    <div class="nav-right">
        <button class="theme-toggle" id="themeToggle" title="切换主题" aria-label="切换主题" onclick="toggleTheme()">
            <span class="icon-moon">🌙</span>
            <span class="icon-sun">☀️</span>
        </button>
        <button class="mobile-toggle" id="mobileToggle">☰</button>
    </div>
</div>
`;

const footerHTML = `
<div class="container">
    <div class="footer-inner">
        <div class="footer-brand">
            <div class="logo">
                <div class="logo-icon">⚡</div>
                <div>
                    <div class="logo-text">云忍者</div>
                    <div class="logo-sub">CloudNinja.cn</div>
                </div>
            </div>
            <p>用真实的模拟考试、详细的解析和专家精心整理的学习指南，帮你掌握阿里云认证。你的云端精进之路，从这里开始。</p>
        </div>
        <div class="footer-links">
            <div class="footer-col">
                <h5>模拟考试</h5>
                <a href="practice.html?exam=aca-cloud">ACA 云计算</a>
                <a href="practice.html?exam=acp-cloud">ACP 云计算</a>
                <a href="practice.html?exam=acp-security">ACP 云安全</a>
                <a href="practice.html?exam=acp-devops">ACP DevOps</a>
                <a href="practice.html?exam=ace-ack">ACE ACK 容器</a>
            </div>
            <div class="footer-col">
                <h5>认证指南</h5>
                <a href="certifications.html">全部认证</a>
                <a href="certifications.html?cert=aca-cloud">ACA 路径</a>
                <a href="certifications.html?cert=acp-cloud">ACP 路径</a>
                <a href="certifications.html?cert=ace-cloud">ACE 路径</a>
            </div>
            <div class="footer-col">
                <h5>资源</h5>
                <a href="index.html#qotd">每日一题</a>
                <a href="game.html">学习游戏</a>
                <a href="about.html">关于我们</a>
                <a href="contact.html">联系我们</a>
            </div>
        </div>
    </div>
    <div class="footer-bottom">
        <p>© 2026 云忍者 CloudNinja.cn — 保留所有权利</p>
        <p>阿里云及所有相关认证均为阿里云计算有限公司的商标</p>
    </div>
</div>
`;

// Inject nav and footer
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('nav');
    if (nav) nav.innerHTML = navHTML;

    const footer = document.getElementById('footer');
    if (footer) footer.innerHTML = footerHTML;

    // Nav scroll effect
    const navEl = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        if (navEl) navEl.classList.toggle('scrolled', window.scrollY > 20);
    });

    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // Highlight active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const linkPage = link.getAttribute('href').split('?')[0];
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });

    // Scroll reveal
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
            }
        });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});
