def build_travel_prompt(destination, days, budget, personality, notes=""):
    """构建旅游攻略生成的Prompt"""
    notes_section = f"\n- 特殊需求：{notes}" if notes else ""
    
    # 处理人格信息
    personality_info = ""
    if personality and personality.get('type') and personality.get('type') != '旅行者':
        personality_info = f"""
- 旅行人格：{personality.get('type', '旅行者')} ({personality.get('type_en', 'Traveler')})
- 人格特点：{personality.get('description', '')}"""
    
    prompt = f"""你是一位专业的旅行规划师。请根据以下信息为用户生成一份详细的旅游攻略。

## 用户信息
- 旅行目的地：{destination}
- 出行天数：{days}天
- 人均预算：{budget}元{personality_info}{notes_section}

## 要求
1. 严格按天规划行程，格式必须为："## 第X天"
2. 每天的景点名称必须用粗体标注，格式为：**景点名称**
3. 每天列出上午、下午、晚上的安排
4. 标注每个景点的预计游览时间和预估费用
5. 推荐当地特色美食，标注人均消费
6. 根据用户的旅行人格特点调整行程节奏和推荐内容（如果有人格信息）
7. 如果有特殊需求，请在规划中充分考虑
8. 提供交通建议（如何到达目的地、市内交通方式）
9. 提供住宿建议（推荐区域和预算范围）

## 输出格式（请严格遵循）
# 目的地概览
简要介绍目的地特色

# 行程安排

## 第1天
**上午**：前往**景点A**（游览时间2小时，门票50元）
**下午**：游览**景点B**（游览时间1.5小时，免费）
**晚上**：品尝当地美食

## 第2天
...

# 美食推荐
- **美食1**：简介，人均消费XX元

# 交通指南
往返和市内交通建议

# 住宿建议
推荐住宿区域和预算范围

# 预算参考
各项费用预估汇总

# 注意事项
旅行提示

请开始生成攻略："""
    return prompt

def build_revision_prompt(original_plan, revision_request):
    """构建修改攻略的Prompt"""
    prompt = f"""请根据用户的要求修改以下旅游攻略。

## 原始攻略
{original_plan}

## 用户修改要求
{revision_request}

## 要求
1. 保持原有的Markdown格式
2. 只修改用户要求的部分，其他内容保持不变
3. 确保修改后的内容连贯、合理

请输出修改后的完整攻略："""
    return prompt

def build_route_extraction_prompt(plan_text):
    """从攻略中提取景点信息"""
    prompt = f"""请从以下旅游攻略中提取每天的景点信息，以JSON格式输出。

## 攻略内容
{plan_text}

## 输出格式
请输出JSON数组，每天一个对象，包含：
```json
[
  {{
    "day": 1,
    "spots": ["景点1", "景点2", "景点3"]
  }},
  {{
    "day": 2,
    "spots": ["景点4", "景点5"]
  }}
]
```

只输出JSON，不要其他内容："""
    return prompt
