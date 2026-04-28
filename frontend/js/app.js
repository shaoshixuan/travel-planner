// API基础URL - 动态获取当前域名
const API_BASE = window.location.origin + '/api';

// 全局状态
const state = {
    currentStep: 1,
    questions: [],
    currentQuestion: 0,
    answers: {},
    personality: null,
    plan: null,
    routes: {},
    currentDay: 1,
    totalDays: 3  // 用户选择的总天数
};

// 页面初始化
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    showQuestion(0);
    setupEventListeners();
});

// 加载题目
async function loadQuestions() {
    try {
        const response = await fetch(`${API_BASE}/questions`);
        const data = await response.json();
        if (data.success) {
            state.questions = data.data;
        }
    } catch (error) {
        console.error('加载题目失败:', error);
    }
}

// 显示题目
function showQuestion(index) {
    if (index < 0 || index >= state.questions.length) return;
    
    state.currentQuestion = index;
    const question = state.questions[index];
    
    const container = document.getElementById('questionContainer');
    container.innerHTML = `
        <div class="question-title">${index + 1}. ${question.question}</div>
        <div class="options-container">
            ${question.options.map((opt, i) => `
                <button class="option-btn ${state.answers[question.id] === opt.score ? 'selected' : ''}" 
                        data-score="${opt.score}">
                    ${opt.text}
                </button>
            `).join('')}
        </div>
    `;
    
    // 绑定选项点击事件
    container.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => selectOption(question.id, parseInt(btn.dataset.score)));
    });
    
    updateProgress();
    updateNavigation();
}

// 选择答案
function selectOption(questionId, score) {
    state.answers[questionId] = score;
    showQuestion(state.currentQuestion);
}

// 更新进度条
function updateProgress() {
    const answered = Object.keys(state.answers).length;
    const total = state.questions.length;
    const percent = (answered / total) * 100;
    
    document.querySelector('.progress-fill').style.width = `${percent}%`;
    document.querySelector('.progress-text').textContent = `${answered}/${total}`;
}

// 更新导航按钮
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = state.currentQuestion === 0;
    nextBtn.disabled = !state.answers[state.questions[state.currentQuestion]?.id];
    
    if (state.currentQuestion === state.questions.length - 1) {
        nextBtn.textContent = '查看结果';
    } else {
        nextBtn.textContent = '下一题';
    }
}

// 设置事件监听
function setupEventListeners() {
    // 导航按钮
    document.getElementById('prevBtn').addEventListener('click', () => {
        showQuestion(state.currentQuestion - 1);
    });
    
    document.getElementById('nextBtn').addEventListener('click', async () => {
        if (state.currentQuestion < state.questions.length - 1) {
            showQuestion(state.currentQuestion + 1);
        } else {
            await submitAnswers();
        }
    });
    
    // 跳过测试按钮
    const skipBtn = document.getElementById('skipTestBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            state.personality = null;  // 标记为未测试
            goToStep(2);
        });
    }
    
    // 重新进行测试链接
    const takeTestLink = document.getElementById('takeTestLink');
    if (takeTestLink) {
        takeTestLink.addEventListener('click', (e) => {
            e.preventDefault();
            goToStep(1);
        });
    }
    
    // 天数滑块
    const daysSlider = document.getElementById('days');
    daysSlider.addEventListener('input', (e) => {
        document.getElementById('daysValue').textContent = `${e.target.value}天`;
    });
    
    // 预算滑块
    const budgetSlider = document.getElementById('budget');
    budgetSlider.addEventListener('input', (e) => {
        document.getElementById('budgetValue').textContent = `${e.target.value}元`;
    });
    
    // 生成攻略按钮
    document.getElementById('generateBtn').addEventListener('click', generatePlan);
    
    // 修改攻略按钮
    document.getElementById('reviseBtn').addEventListener('click', () => {
        document.getElementById('reviseModal').classList.remove('hidden');
    });
    
    // 关闭模态框
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('reviseModal').classList.add('hidden');
        });
    });
    
    // 提交修改
    document.getElementById('submitRevision').addEventListener('click', revisePlan);
    
    // 查看路线
    document.getElementById('viewRouteBtn').addEventListener('click', () => goToStep(4));
    
    // 导出按钮
    document.getElementById('exportBtn').addEventListener('click', () => goToStep(5));
    
    // 返回攻略
    document.getElementById('prevStepBtn').addEventListener('click', () => goToStep(3));
    
    // 导出PDF
    document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
    
    // 复制Markdown
    document.getElementById('copyMarkdownBtn').addEventListener('click', copyMarkdown);
    
    // 重新开始
    document.getElementById('restartBtn').addEventListener('click', () => {
        if (confirm('确定要重新开始吗？当前进度将丢失。')) {
            location.reload();
        }
    });
    
    // Markdown编辑器实时预览
    const editor = document.getElementById('markdownEditor');
    editor.addEventListener('input', () => {
        const preview = document.getElementById('documentPreview');
        preview.innerHTML = marked.parse(editor.value);
    });
}

// 提交答案，计算人格
async function submitAnswers() {
    try {
        const response = await fetch(`${API_BASE}/calculate-personality`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: state.answers })
        });
        
        const data = await response.json();
        if (data.success) {
            state.personality = data.data;
            showPersonalityResult();
            goToStep(2);
        }
    } catch (error) {
        console.error('计算人格失败:', error);
        alert('计算失败，请重试');
    }
}

// 显示人格测试结果
function showPersonalityResult() {
    document.getElementById('personalityEmoji').textContent = state.personality.emoji;
    document.getElementById('personalityType').textContent = `${state.personality.type} · ${state.personality.type_en || ''}`;
    document.getElementById('personalityDesc').textContent = state.personality.description;
}

// 生成攻略
async function generatePlan() {
    const destination = document.getElementById('destination').value.trim();
    const days = document.getElementById('days').value;
    const budget = document.getElementById('budget').value;
    const notes = document.getElementById('notes').value.trim();
    
    if (!destination) {
        alert('请输入目的地城市');
        return;
    }
    
    // 保存用户选择的天数
    state.totalDays = parseInt(days);
    
    // 如果没有人格测试结果，使用默认人格
    const personality = state.personality || {
        type: '旅行者',
        type_en: 'Traveler',
        emoji: '✈️',
        description: '未进行人格测试，AI将为你生成通用风格的攻略'
    };
    
    // 显示加载状态
    const planContent = document.getElementById('planContent');
    planContent.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>AI正在生成攻略...</p>
            <p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">预计需要10-30秒</p>
        </div>
    `;
    
    goToStep(3);
    
    try {
        const response = await fetch(`${API_BASE}/generate-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destination,
                days: parseInt(days),
                budget: parseInt(budget),
                notes,
                personality
            })
        });
        
        const data = await response.json();
        if (data.success) {
            state.plan = data.data.plan;
            renderPlan(state.plan);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('生成攻略失败:', error);
        planContent.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #ef4444;">
                <p>生成失败：${error.message}</p>
                <button class="btn btn-primary" onclick="generatePlan()" style="margin-top: 1rem;">重试</button>
            </div>
        `;
    }
}

// 渲染攻略内容
function renderPlan(plan) {
    const planContent = document.getElementById('planContent');
    planContent.innerHTML = marked.parse(plan);
}

// 修改攻略
async function revisePlan() {
    const revision = document.getElementById('revisionInput').value.trim();
    if (!revision) {
        alert('请输入修改要求');
        return;
    }
    
    document.getElementById('reviseModal').classList.add('hidden');
    
    const planContent = document.getElementById('planContent');
    planContent.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>AI正在修改攻略...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/revise-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalPlan: state.plan,
                revision
            })
        });
        
        const data = await response.json();
        if (data.success) {
            state.plan = data.data.plan;
            renderPlan(state.plan);
        }
    } catch (error) {
        console.error('修改攻略失败:', error);
        alert('修改失败，请重试');
        renderPlan(state.plan);
    }
    
    document.getElementById('revisionInput').value = '';
}

// 导出PDF
async function exportPdf() {
    const btn = document.getElementById('exportPdfBtn');
    btn.innerHTML = '<span>⏳</span> 正在生成PDF...';
    btn.disabled = true;

    try {
        // 获取预览区元素（已在DOM中渲染好）
        const preview = document.getElementById('documentPreview');
        if (!preview) {
            throw new Error('预览区元素未找到');
        }

        // 确保预览区有内容
        if (!preview.innerHTML.trim()) {
            // 如果没有内容，先初始化
            initDocumentEditor();
            await new Promise(r => setTimeout(r, 500));
        }

        // 如果还没有路线信息，且有地图数据，追加路线内容
        const totalDays = getTotalDaysCount();
        const allRouteData = getAllDailyRouteData();
        
        if (totalDays > 0 && Object.keys(allRouteData).length > 0) {
            let routeHtml = '<hr style="margin:30px 0; border:none; border-top:2px solid #e5e7eb;"><h2 style="color:#1e1b4b; font-size:20px; margin:0 0 20px;">🗺️ 路线可视化</h2>';
            
            for (let day = 1; day <= totalDays; day++) {
                const routeData = allRouteData[day];
                if (!routeData) continue;
                
                routeHtml += `<div style="margin-bottom:28px; page-break-inside:avoid;">
                    <h3 style="color:#4f46e5; border-left:4px solid #4f46e5; padding-left:10px; margin:0 0 12px;">第 ${day} 天路线</h3>`;
                
                // 地图截图
                const mapImg = await switchDayAndCapture(day);
                if (mapImg) {
                    routeHtml += `<img src="${mapImg}" style="width:100%; border-radius:8px; margin-bottom:12px; border:1px solid #e5e7eb;">`;
                }
                
                // 景点列表
                if (routeData.spots && routeData.spots.length > 0) {
                    routeHtml += '<div style="background:#fafafa; border-radius:8px; padding:12px;">';
                    routeData.spots.forEach((spot, idx) => {
                        routeHtml += `<div style="display:flex; align-items:flex-start; margin-bottom:8px;">
                            <span style="display:inline-flex; width:24px; height:24px; background:#4f46e5; color:white; border-radius:50%; align-items:center; justify-content:center; font-size:12px; font-weight:bold; margin-right:8px; flex-shrink:0;">${idx+1}</span>
                            <div><b style="font-size:14px;">${spot.name}</b>`;
                        const seg = routeData.segments[idx];
                        if (seg) {
                            routeHtml += '<div style="margin-top:3px;">';
                            if (seg.walking) routeHtml += `<span style="background:#ede9fe; color:#5b21b6; padding:2px 8px; border-radius:20px; font-size:11px; margin-right:4px;">🚶${seg.walking.duration}分</span>`;
                            if (seg.driving) routeHtml += `<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:20px; font-size:11px; margin-right:4px;">🚗${seg.driving.duration}分</span>`;
                            if (seg.transit) routeHtml += `<span style="background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:20px; font-size:11px;">🚇${seg.transit.duration}分</span>`;
                            routeHtml += '</div>';
                        }
                        routeHtml += '</div></div>';
                    });
                    routeHtml += '</div>';
                }
                routeHtml += '</div>';
            }
            
            // 追加到预览区（临时）
            const routeDiv = document.createElement('div');
            routeDiv.id = 'pdfRouteSection';
            routeDiv.innerHTML = routeHtml;
            preview.appendChild(routeDiv);
        }

        // 导出设置
        const opt = {
            margin: 10,
            filename: `旅行攻略_${new Date().toLocaleDateString()}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(preview).save();

        // 清理临时添加的路线部分
        const routeSection = document.getElementById('pdfRouteSection');
        if (routeSection) routeSection.remove();

    } catch (e) {
        console.error('PDF导出失败:', e);
        alert('PDF导出失败：' + e.message);
    } finally {
        btn.innerHTML = '<span>📥</span> 导出PDF';
        btn.disabled = false;
    }
}

// 复制Markdown
function copyMarkdown() {
    const editor = document.getElementById('markdownEditor');
    navigator.clipboard.writeText(editor.value).then(() => {
        const btn = document.getElementById('copyMarkdownBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>✓</span> 已复制';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

// 切换步骤
function goToStep(step) {
    state.currentStep = step;
    
    // 更新页面显示
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    
    // 更新导航步骤指示器
    document.querySelectorAll('.nav-steps .step').forEach(s => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (stepNum < step) {
            s.classList.add('completed');
        } else if (stepNum === step) {
            s.classList.add('active');
        }
    });
    
    // 如果进入步骤2，根据是否有人格测试结果显示不同UI
    if (step === 2) {
        updatePersonalityDisplay();
    }
    
    // 如果是文档导出页面，初始化编辑器内容
    if (step === 5) {
        initDocumentEditor();
    }
    
    // 如果是路线规划页面，初始化地图
    if (step === 4) {
        initMap();
    }
}

// 更新人格测试结果显示
function updatePersonalityDisplay() {
    const personalityResult = document.getElementById('personalityResult');
    const noPersonality = document.getElementById('noPersonality');
    
    if (state.personality) {
        personalityResult.style.display = 'flex';
        noPersonality.style.display = 'none';
        document.getElementById('personalityEmoji').textContent = state.personality.emoji;
        document.getElementById('personalityType').textContent = `${state.personality.type} · ${state.personality.type_en || 'Traveler'}`;
        document.getElementById('personalityDesc').textContent = state.personality.description;
    } else {
        personalityResult.style.display = 'none';
        noPersonality.style.display = 'flex';
    }
}

// 初始化文档编辑器
function initDocumentEditor() {
    const editor = document.getElementById('markdownEditor');
    const preview = document.getElementById('documentPreview');
    
    // 构建完整的Markdown文档
    let markdown;
    
    if (state.personality) {
        markdown = `# ${state.personality.emoji} ${state.personality.type} (${state.personality.type_en || 'Traveler'}) 的旅行攻略

## 旅行人格测试结果

**人格类型：** ${state.personality.type} · ${state.personality.type_en || 'Traveler'}

**人格描述：** ${state.personality.description}

---

${state.plan}

---

*生成时间：${new Date().toLocaleString()}*
`;
    } else {
        markdown = `# 🗺️ 旅行攻略

${state.plan}

---

*生成时间：${new Date().toLocaleString()}*
`;
    }
    
    editor.value = markdown;
    preview.innerHTML = marked.parse(markdown);
}

