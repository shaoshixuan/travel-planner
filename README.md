# 旅行规划智能体

一个基于AI的旅行规划Demo，可以测试你的旅行人格，生成个性化攻略，可视化路线，并导出文档。

## 功能特性

- 🎯 **Travel-TI人格测试**：12道题测出你的16种旅行人格
- 📝 **智能攻略生成**：基于智谱AI，根据你的偏好定制攻略
- 🗺️ **路线可视化**：地图展示每日行程路线（需配置高德API）
- 📄 **文档导出**：一键导出PDF或复制Markdown

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置API密钥

编辑 `backend/.env` 文件：

```env
ZHIPU_API_KEY=你的智谱AI密钥
AMAP_API_KEY=你的高德地图密钥（可选，用于地图功能）
```

#### 获取API密钥

- **智谱AI/硅基流动**：访问 https://api.siliconflow.cn 注册并获取API Key（新用户有免费额度）
- **高德地图**：访问 https://console.amap.com/dev/key/app 申请Web端Key（每日30万次免费调用）

**注意**：高德地图Key也可以在前端页面直接输入，无需配置后端环境变量。

### 3. 启动服务

```bash
# 方式一：直接启动
cd backend
python app.py

# 方式二：使用启动脚本（Mac/Linux）
./start.sh

# 方式三：使用启动脚本（Windows）
start.bat
```

### 4. 访问应用

打开浏览器访问：http://localhost:5000

## 项目结构

```
travel-planner/
├── backend/
│   ├── app.py              # Flask主应用
│   ├── config.py           # 配置文件
│   ├── requirements.txt    # Python依赖
│   ├── .env                # 环境变量（API密钥）
│   ├── data/
│   │   └── questions.json  # 人格测试题库
│   └── utils/
│       ├── llm_client.py   # 智谱AI调用封装
│       ├── map_client.py   # 高德地图API封装
│       └── prompt_builder.py # Prompt模板
├── frontend/
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       └── app.js          # 前端逻辑
└── README.md
```

## 使用流程

1. **人格测试**（约1分钟）
   - 回答12道选择题
   - 获得你的16种旅行人格之一

2. **生成攻略**
   - 输入目的地、天数、预算
   - AI根据你的旅行人格生成个性化攻略

3. **查看路线**（需配置高德API）
   - 地图上可视化每日行程
   - 查看交通方式和时间

4. **导出文档**
   - 在线编辑攻略内容
   - 导出PDF或复制Markdown

## 16种旅行人格

基于4个维度组合：
- **探索 vs 舒适**：喜欢冒险还是安逸？
- **深度 vs 广度**：深入体验还是走马观花？
- **社交 vs 独处**：喜欢热闹还是安静？
- **计划 vs 随性**：严格规划还是随心而行？

每种组合对应一种独特的人格类型，如探险家、佛系客、打卡达人等。

## 技术栈

- **后端**：Python Flask
- **前端**：原生HTML/CSS/JavaScript
- **AI**：智谱AI GLM-4
- **地图**：高德地图JS API（可选）
- **文档**：marked.js + html2pdf.js

## 常见问题

### Q: 智谱AI调用失败？
A: 检查API Key是否正确，账户是否有余额。新用户注册后会有免费额度。

### Q: 地图无法显示？
A: 高德地图API Key需要单独申请。不配置也能使用其他功能。

### Q: 攻略生成很慢？
A: LLM生成需要10-30秒，请耐心等待。

## 部署到云端

### Render（推荐）

1. 注册 https://render.com/
2. 创建新的Web Service
3. 连接GitHub仓库
4. Build Command: `pip install -r backend/requirements.txt`
5. Start Command: `cd backend && python app.py`

### Railway

1. 注册 https://railway.app/
2. 创建新项目，连接GitHub
3. 配置环境变量（ZHIPU_API_KEY）
4. 自动部署

## License

MIT
