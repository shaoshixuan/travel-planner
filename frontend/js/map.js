// ===== 地图模块 =====
let map = null;
let amapKey = '';
let dailySpots = {};

// 缓存每天的路线数据（供PDF导出使用）
// 格式: { 1: { spots: [{name, location}], segments: [{from,to,walking,driving,transit}] }, ... }
let dailyRouteData = {};

// 供 app.js 调用的入口：进入step4时触发
function initMap() {
    const keyInput = document.getElementById('amapKeyInput');
    const loadBtn = document.getElementById('loadMapBtn');
    const daySelector = document.querySelector('.day-selector');

    if (!keyInput || !loadBtn) {
        console.error('地图DOM元素未找到');
        return;
    }

    amapKey = localStorage.getItem('amap_key') || '80f438ed011cdd427202d0da4dc0d7bb';
    keyInput.value = amapKey;

    // 绑定"加载地图"按钮
    loadBtn.onclick = () => {
        const key = keyInput.value.trim();
        if (!key) { alert('请输入高德地图API Key'); return; }
        localStorage.setItem('amap_key', key);
        amapKey = key;
        startLoadAMap(key);
    };

    // 日切换事件委托（绑定在 daySelector 上）
    if (daySelector) {
        daySelector.onclick = (e) => {
            const btn = e.target.closest('.day-btn');
            if (btn) {
                const day = parseInt(btn.dataset.day);
                if (!isNaN(day)) switchDay(day);
            }
        };
    }

    // 自动用已保存的 key 加载
    if (amapKey) {
        startLoadAMap(amapKey);
    }
}

let amapLoaded = false;

function startLoadAMap(key) {
    const placeholder = document.getElementById('mapPlaceholder');
    if (placeholder) {
        placeholder.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>正在加载地图...</p>
            </div>`;
    }

    // 如果AMap已经加载过，直接初始化地图实例
    if (window.AMap && amapLoaded) {
        createMapInstance();
        return;
    }

    window._AMapSecurityConfig = {
        securityJsCode: 'd912fbb9e2d3497e47d2be953ecc4f8e'
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geocoder,AMap.Walking,AMap.Driving,AMap.Transfer`;
    script.onload = () => {
        amapLoaded = true;
        createMapInstance();
    };
    script.onerror = () => {
        if (placeholder) {
            placeholder.innerHTML = `<p style="color:#ef4444;">地图加载失败，请检查API Key</p>`;
        }
    };
    document.head.appendChild(script);
}

function createMapInstance() {
    try {
        const placeholder = document.getElementById('mapPlaceholder');
        if (placeholder) placeholder.style.display = 'none';

        if (map) {
            map.destroy();
            map = null;
        }

        map = new AMap.Map('mapContainer', {
            zoom: 12,
            viewMode: '2D'
        });

        console.log('地图实例创建成功');
        // 地图就绪后解析路线
        parseAndRenderRoute();
    } catch (e) {
        console.error('地图初始化失败:', e);
        const placeholder = document.getElementById('mapPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.innerHTML = `<p style="color:#ef4444;">地图初始化失败: ${e.message}</p>`;
        }
    }
}

function switchDay(day) {
    console.log('切换到第', day, '天');
    state.currentDay = day;

    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.day) === day);
    });

    renderDayRoute(day);
}

function parseAndRenderRoute() {
    if (!state.plan || !map) {
        console.log('parseAndRenderRoute: plan或map未就绪');
        return;
    }

    dailySpots = extractSpotsByDay(state.plan);
    console.log('提取的景点:', dailySpots);

    const totalDays = state.totalDays || Object.keys(dailySpots).length || 3;
    updateDayButtons(totalDays);

    state.currentDay = 1;
    renderDayRoute(1);
}

function updateDayButtons(count) {
    const selector = document.querySelector('.day-selector');
    if (!selector) return;
    selector.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const btn = document.createElement('button');
        btn.className = `day-btn${i === 1 ? ' active' : ''}`;
        btn.dataset.day = i;
        btn.textContent = `第${i}天`;
        selector.appendChild(btn);
    }
    console.log(`已生成 ${count} 个日按钮`);
}

function extractSpotsByDay(text) {
    const result = {};
    const lines = text.split('\n');
    let currentDay = 0;
    let inSectionStop = false; // 进入非行程章节后停止提取

    for (const line of lines) {
        // 匹配 "第X天" 标题行（含 ## 标题）
        const dayMatch = line.match(/第\s*(\d+)\s*天/);
        if (dayMatch && line.startsWith('#')) {
            currentDay = parseInt(dayMatch[1]);
            inSectionStop = false;
            if (!result[currentDay]) result[currentDay] = [];
            continue;
        }

        // 非行程章节（美食/住宿等），停止提取当前日景点
        if (line.startsWith('#') && line.match(/美食|住宿|交通|预算|注意|贴士|tips|花费|费用|总结/i)) {
            inSectionStop = true;
            continue;
        }
        // 新的 ## 章节（不含"第X天"）也重置
        if (line.startsWith('##') && !dayMatch) {
            inSectionStop = false; // 新章节可能还是行程相关
        }

        if (currentDay > 0 && !inSectionStop) {
            const boldMatches = line.match(/\*\*([^*]+)\*\*/g);
            if (boldMatches) {
                for (const m of boldMatches) {
                    const name = m.replace(/\*\*/g, '').trim();
                    // 过滤规则：
                    // 1. 长度2-12（景点名一般不超12字）
                    // 2. 不含时间词
                    // 3. 不含括号/顿号（景点名一般不含这些）
                    // 4. 不是纯时间/活动描述
                    const excludeWords = ['上午', '下午', '晚上', '中午', '早上', '行程', '概览', '推荐', '指南', '建议', '第一天', '第二天', '第三天', '第四天', '第五天', '注意', '温馨', '小贴士'];
                    const hasExclude = excludeWords.some(w => name.includes(w));
                    const isTooLong = name.length > 12;
                    // 含括号且较长的通常是描述性文字，不是景点名
                    const hasParenthesis = /[（）()]/.test(name) && name.length > 6;
                    if (!hasExclude && !isTooLong && !hasParenthesis && name.length >= 2) {
                        // 含并列词且超过8字的跳过（如"春熙路或成都IFS"）
                        if (name.length > 8 && /[或及和与、]/.test(name)) continue;
                        result[currentDay].push(name);
                    }
                }
            }
        }
    }

    // 去重，最多6个
    for (const day in result) {
        result[day] = [...new Set(result[day])].slice(0, 6);
        console.log(`第${day}天景点:`, result[day]);
    }

    // 兜底：没有按天提取时，所有景点放第1天
    if (Object.keys(result).length === 0) {
        const allSpots = [];
        for (const line of lines) {
            const boldMatches = line.match(/\*\*([^*]+)\*\*/g);
            if (boldMatches) {
                for (const m of boldMatches) {
                    const name = m.replace(/\*\*/g, '').trim();
                    const excludeWords = ['上午', '下午', '晚上', '中午', '行程', '概览', '推荐', '注意'];
                    if (name.length >= 2 && name.length <= 10 && !excludeWords.some(w => name.includes(w))) {
                        allSpots.push(name);
                    }
                }
            }
        }
        if (allSpots.length > 0) result[1] = [...new Set(allSpots)].slice(0, 8);
    }

    return result;
}

async function renderDayRoute(day) {
    console.log(`renderDayRoute: 第${day}天`);
    const spots = dailySpots[day] || [];
    const routeList = document.getElementById('routeList');
    const totalDistance = document.getElementById('totalDistance');
    const totalTime = document.getElementById('totalTime');

    if (!map) { console.log('地图未初始化'); return; }

    map.clearMap();

    if (spots.length === 0) {
        if (routeList) routeList.innerHTML = '<p style="color:#6b7280;padding:16px;">当天无景点数据</p>';
        if (totalDistance) totalDistance.textContent = '--';
        if (totalTime) totalTime.textContent = '--';
        return;
    }

    // 先显示景点列表（不等路线计算）
    if (routeList) {
        routeList.innerHTML = spots.map((name, i) =>
            `<div class="route-item">
                <div class="route-marker">${i + 1}</div>
                <div class="route-info"><h4>${name}</h4><p class="route-next">路线计算中...</p></div>
            </div>`
        ).join('');
    }

    // 地理编码
    const city = document.getElementById('destination')?.value?.trim() || '北京';
    const geocoder = new AMap.Geocoder({ city: city });
    const spotsWithLoc = [];

    for (const spotName of spots) {
        try {
            const loc = await new Promise((resolve, reject) => {
                geocoder.getLocation(spotName, (status, result) => {
                    if (status === 'complete' && result.geocodes?.[0]?.location) {
                        resolve(result.geocodes[0].location);
                    } else {
                        reject(new Error(`${spotName}解析失败`));
                    }
                });
            });
            spotsWithLoc.push({ name: spotName, location: loc });
            console.log(`✓ ${spotName}:`, loc.lng, loc.lat);
        } catch (e) {
            console.log(`✗ 跳过"${spotName}":`, e.message);
        }
    }

    if (spotsWithLoc.length === 0) {
        if (routeList) routeList.innerHTML = '<p style="color:#ef4444;padding:16px;">所有景点地址解析失败</p>';
        return;
    }

    // 添加标记
    const markers = [];
    spotsWithLoc.forEach((spot, idx) => {
        const marker = new AMap.Marker({
            position: spot.location,
            content: `<div class="custom-marker">${idx + 1}</div>`,
            title: spot.name
        });
        marker.setMap(map);
        markers.push(marker);
        marker.on('click', () => {
            new AMap.InfoWindow({
                content: `<div style="padding:8px;font-size:14px;"><b>${spot.name}</b></div>`,
                offset: new AMap.Pixel(0, -30)
            }).open(map, spot.location);
        });
    });

    // 调整视野到景点区域
    map.setFitView(markers, false, [50, 50, 50, 50]);

    // 计算各段交通方式
    const segments = [];
    for (let i = 0; i < spotsWithLoc.length - 1; i++) {
        const from = spotsWithLoc[i];
        const to = spotsWithLoc[i + 1];
        const seg = { from: from.name, to: to.name, walking: null, driving: null, transit: null };

        // 步行
        try {
            const r = await new Promise((resolve, reject) => {
                new AMap.Walking().search(from.location, to.location, (status, result) => {
                    status === 'complete' && result.routes?.[0] ? resolve(result.routes[0]) : reject();
                });
            });
            seg.walking = { distance: Math.round(r.distance), duration: Math.round(r.time / 60) };
            // 绘制路线
            const path = r.steps.flatMap(s => s.path);
            new AMap.Polyline({ path, strokeColor: '#4f46e5', strokeWeight: 5, strokeOpacity: 0.8 }).setMap(map);
        } catch (e) {}

        // 驾车
        try {
            const r = await new Promise((resolve, reject) => {
                new AMap.Driving().search(from.location, to.location, (status, result) => {
                    status === 'complete' && result.routes?.[0] ? resolve(result.routes[0]) : reject();
                });
            });
            seg.driving = { distance: Math.round(r.distance), duration: Math.round(r.time / 60) };
        } catch (e) {}

        // 公交
        try {
            const r = await new Promise((resolve, reject) => {
                new AMap.Transfer({ city }).search(from.location, to.location, (status, result) => {
                    status === 'complete' && result.plans?.[0] ? resolve(result.plans[0]) : reject();
                });
            });
            seg.transit = { distance: Math.round(r.distance), duration: Math.round(r.time / 60), cost: r.cost || 0 };
        } catch (e) {}

        segments.push(seg);
    }

    // 缓存本天路线数据（供PDF导出使用）
    dailyRouteData[day] = { spots: spotsWithLoc, segments };

    // 渲染最终路线列表
    let html = '';
    spotsWithLoc.forEach((spot, idx) => {
        html += `<div class="route-item">
            <div class="route-marker">${idx + 1}</div>
            <div class="route-info">
                <h4>${spot.name}</h4>`;

        if (segments[idx]) {
            const seg = segments[idx];
            html += '<div class="route-transport">';
            if (seg.walking) html += `<span class="transport-option walking">🚶 ${seg.walking.duration}分钟 (${(seg.walking.distance / 1000).toFixed(1)}km)</span>`;
            if (seg.driving) html += `<span class="transport-option driving">🚗 ${seg.driving.duration}分钟</span>`;
            if (seg.transit) html += `<span class="transport-option transit">🚇 ${seg.transit.duration}分钟${seg.transit.cost > 0 ? ' (¥' + seg.transit.cost + ')' : ''}</span>`;
            html += '</div>';
        } else if (idx < spotsWithLoc.length - 1) {
            html += '<p class="route-next">→ 下一站</p>';
        }

        html += '</div></div>';
    });

    if (routeList) routeList.innerHTML = html;

    // 汇总
    let totalWalkDist = 0, totalWalkTime = 0, totalDriveTime = 0, totalTransitTime = 0;
    segments.forEach(seg => {
        if (seg.walking) { totalWalkDist += seg.walking.distance; totalWalkTime += seg.walking.duration; }
        if (seg.driving) totalDriveTime += seg.driving.duration;
        if (seg.transit) totalTransitTime += seg.transit.duration;
    });

    if (totalDistance) totalDistance.textContent = `${(totalWalkDist / 1000).toFixed(1)}km`;
    const parts = [];
    if (totalWalkTime > 0) parts.push(`步行${totalWalkTime}分`);
    if (totalDriveTime > 0) parts.push(`驾车${totalDriveTime}分`);
    if (totalTransitTime > 0) parts.push(`公交${totalTransitTime}分`);
    if (totalTime) totalTime.textContent = parts.length > 0 ? parts.join('/') : '--';
}

// ===== PDF 导出辅助函数 =====

// 获取所有天的路线数据
function getAllDailyRouteData() {
    return dailyRouteData;
}

// 获取总天数
function getTotalDaysCount() {
    return state.totalDays || Object.keys(dailySpots).length || 0;
}

// 切换到指定天并等待渲染完成，返回地图截图 base64
async function switchDayAndCapture(day) {
    return new Promise(async (resolve) => {
        // 切换到目标天并等待路线渲染
        await renderDayRoute(day);
        state.currentDay = day;

        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.day) === day);
        });

        // 等待地图渲染稳定（路线绘制需要时间）
        await new Promise(r => setTimeout(r, 1500));

        // 用后端静态图API生成地图图片
        const routeData = dailyRouteData[day];
        if (!routeData || routeData.spots.length === 0) {
            resolve(null);
            return;
        }

        try {
            const locations = routeData.spots.map(s => ({
                lng: s.location.lng,
                lat: s.location.lat,
                name: s.name
            }));

            const resp = await fetch('http://localhost:8888/api/map-snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locations })
            });

            if (resp.ok && resp.headers.get('content-type')?.startsWith('image')) {
                const blob = await resp.blob();
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            } else {
                console.log('静态图API返回异常，跳过地图图片');
                resolve(null);
            }
        } catch (e) {
            console.log('静态图请求失败:', e);
            resolve(null);
        }
    });
}
