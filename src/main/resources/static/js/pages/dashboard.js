import { me, bootReady, canAny, can } from '../core/boot.js';
import { api } from '../core/api.js';
import { esc, fmtTime, statusBadge, toast } from '../core/ui.js';
import { askGuide } from '../guide.js';

// 本页没有依赖模块级 const，但保持同一写法：初始化异常要落到控制台而不是静默
bootReady.then(() => (me ? main() : null)).catch((e) => console.error('工作台初始化失败', e));

async function main() {
    const hour = new Date().getHours();
    const hello = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    document.getElementById('greeting').textContent = `${hello}，${me.nickname || me.username}`;
    document.getElementById('today').textContent = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    if (canAny('article:audit', 'user:manage')) {
        document.getElementById('global-stats').style.display = 'grid';
    }

    loadQuickActions();
    await Promise.all([loadStats(), loadRecent(), loadSuggestions()]);
}

// 固定快捷入口：按当前用户权限过滤，无权限的入口不渲染，避免点击后 403
const QUICK_ACTIONS = [
    {
        perm: 'article:create', href: '/app/article-edit', title: '写新文章',
        desc: '记录你的想法，创作新的内容', tone: '#8b5cf6',
        icon: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
    },
    {
        perm: 'article:audit', href: '/app/review', title: '处理审核',
        desc: '查看待审核的内容并给出反馈', tone: '#fbbf24',
        icon: '<path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M8 11l4 4L21 4"/>',
    },
    {
        perm: 'user:manage', href: '/app/users', title: '管理用户',
        desc: '查看和管理平台用户', tone: '#38bdf8',
        icon: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
    },
    {
        perm: 'role:manage', href: '/app/roles', title: '角色与权限',
        desc: '配置角色与权限分配', tone: '#e879f9',
        icon: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
    },
];

function loadQuickActions() {
    const host = document.getElementById('quick-actions');
    const list = QUICK_ACTIONS.filter((a) => can(a.perm));
    if (!list.length) {
        host.innerHTML = '<div class="empty" style="padding:20px 0">暂无可执行的快捷操作。</div>';
        return;
    }
    host.innerHTML = list.map((a) => `
        <a class="quick-action" href="${a.href}">
            <span class="qa-ico" style="--tone:${a.tone}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                     stroke-linecap="round" stroke-linejoin="round">${a.icon}</svg>
            </span>
            <span class="qa-text">
                <span class="qa-title">${a.title}</span>
                <span class="qa-desc">${a.desc}</span>
            </span>
            <span class="qa-arrow">›</span>
        </a>`).join('');
}

async function loadStats() {
    try {
        const s = await api.get('/api/dashboard/stats');
        set('st-draft', s.myDraft);
        set('st-pending', s.myPending);
        set('st-rejected', s.myRejected);
        set('st-published', s.myPublished);
        set('st-pending-total', s.pendingTotal);
        set('st-published-total', s.publishedTotal);
        set('st-categories', s.categoryCount);
        set('st-users', s.userCount);
    } catch (e) {
        toast('工作台统计加载失败：' + e.message, 'err');
    }
}

function set(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v === null || v === undefined ? '—' : v;
}

async function loadRecent() {
    const tbody = document.getElementById('recent-body');
    try {
        const page = await api.get('/api/articles', {
            mine: 1, pageNum: 1, pageSize: 5, sort: 'updateTime,desc',
        });
        if (!page.records.length) {
            tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="big">◌</div>
                还没有稿件，<a href="/app/article-edit">写第一篇</a></div></td></tr>`;
            return;
        }
        tbody.innerHTML = page.records.map((a) => `
            <tr>
                <td class="ellipsis" style="max-width:260px">
                    <a href="/app/article-edit?id=${a.id}">${esc(a.title)}</a>
                </td>
                <td>${statusBadge(a.status)}</td>
                <td class="muted nowrap">${fmtTime(a.updateTime)}</td>
                <td class="actions">
                    ${a.status === 'DRAFT' || a.status === 'REJECTED'
            ? `<a class="btn-link" href="/app/article-edit?id=${a.id}">编辑</a>` : ''}
                    ${a.status === 'PENDING' ? `<a class="btn-link" href="/app/articles?status=PENDING&mine=1">查看</a>` : ''}
                    ${a.status === 'PUBLISHED' ? `<a class="btn-link" href="/portal/article/${a.id}" target="_blank" rel="noopener">前台</a>` : ''}
                </td>
            </tr>`).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty">加载失败：${esc(e.message)}</div></td></tr>`;
    }
}

async function loadSuggestions() {
    const host = document.getElementById('suggestions');
    try {
        const list = await api.get('/api/guide/suggestions');
        if (!list.length) {
            host.innerHTML = `<div class="empty" style="padding:28px 0"><div class="big">✓</div>
                暂时没有需要提醒的事，去<a href="/app/articles">文章列表</a>看看。</div>`;
            return;
        }
        host.innerHTML = list.map((s) => `
            <button class="sug" type="button" data-q="${esc(s.text)}">
                <span class="dot ${s.level === 'WARN' ? 'warn' : ''}"></span>
                <span class="txt">${esc(s.text)}</span>
                <span class="go">问助手 →</span>
            </button>`).join('');
        host.querySelectorAll('.sug').forEach((b) => {
            b.onclick = () => askGuide(b.dataset.q);
        });
    } catch (e) {
        host.innerHTML = `<div class="empty" style="padding:28px 0">引导建议加载失败：${esc(e.message)}</div>`;
    }
}
