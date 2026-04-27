from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
import os
import json
import requests as http_requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='../frontend')
CORS(app)

# 导入工具函数
from utils import (
    get_llm_client, 
    build_travel_prompt, 
    build_revision_prompt,
    get_map_client
)

# 加载题目数据
def load_questions():
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'questions.json')
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

# 静态文件路由
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

# API路由
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Server is running'})

@app.route('/api/questions', methods=['GET'])
def get_questions():
    try:
        questions = load_questions()
        return jsonify({'success': True, 'data': questions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/calculate-personality', methods=['POST'])
def calculate_personality():
    try:
        answers = request.json.get('answers', {})
        questions = load_questions()
        
        # 计算各维度得分
        scores = {
            'exploration': 0,
            'depth': 0,
            'social': 0,
            'planning': 0
        }
        
        for q in questions:
            qid = str(q['id'])
            if qid in answers:
                dimension = q['dimension']
                scores[dimension] += answers[qid]
        
        personality_type = determine_personality(scores)
        
        return jsonify({
            'success': True,
            'data': personality_type
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    """生成旅游攻略"""
    try:
        data = request.json
        destination = data.get('destination', '')
        days = data.get('days', 3)
        budget = data.get('budget', 3000)
        notes = data.get('notes', '')
        personality = data.get('personality', {})
        
        prompt = build_travel_prompt(destination, days, budget, personality, notes)
        llm = get_llm_client()
        plan = llm.generate(prompt)
        
        return jsonify({
            'success': True,
            'data': {'plan': plan}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/revise-plan', methods=['POST'])
def revise_plan():
    """修改旅游攻略"""
    try:
        data = request.json
        original_plan = data.get('originalPlan', '')
        revision = data.get('revision', '')
        
        prompt = build_revision_prompt(original_plan, revision)
        llm = get_llm_client()
        revised_plan = llm.generate(prompt)
        
        return jsonify({
            'success': True,
            'data': {'plan': revised_plan}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/geocode', methods=['POST'])
def geocode():
    """地理编码：地址转坐标"""
    try:
        data = request.json
        addresses = data.get('addresses', [])
        city = data.get('city', '')
        
        map_client = get_map_client()
        results = map_client.batch_geocode(addresses, city)
        
        return jsonify({
            'success': True,
            'data': results
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/route', methods=['POST'])
def get_route():
    """路线规划"""
    try:
        data = request.json
        points = data.get('points', [])
        city = data.get('city', '')
        mode = data.get('mode', 'walking')  # walking, driving, transit
        
        if len(points) < 2:
            return jsonify({'success': False, 'error': '至少需要2个点'}), 400
        
        map_client = get_map_client()
        routes = []
        
        for i in range(len(points) - 1):
            origin = f"{points[i]['lng']},{points[i]['lat']}"
            destination = f"{points[i+1]['lng']},{points[i+1]['lat']}"
            
            if mode == 'walking':
                result = map_client.get_walking_route(origin, destination)
            elif mode == 'driving':
                result = map_client.get_driving_route(origin, destination)
            elif mode == 'transit':
                result = map_client.get_transit_route(origin, destination, city)
            else:
                result = map_client.get_walking_route(origin, destination)
            
            routes.append({
                'from': points[i]['address'],
                'to': points[i+1]['address'],
                'mode': mode,
                **result
            })
        
        return jsonify({
            'success': True,
            'data': routes
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def determine_personality(scores):
    """根据得分确定旅行人格类型"""
    e = 'E' if scores['exploration'] > 0 else 'C'
    d = 'D' if scores['depth'] > 0 else 'S'
    s = 'S' if scores['social'] > 0 else 'I'
    p = 'P' if scores['planning'] > 0 else 'F'
    
    personality_map = {
        'EDSP': {'name': '探险家', 'name_en': 'Explorer', 'emoji': '🎯', 'desc': '你喜欢深入探索未知的地方，善于社交，习惯精心规划每一次旅程'},
        'EDSF': {'name': '自由行者', 'name_en': 'Freewanderer', 'emoji': '🌊', 'desc': '你热爱冒险和深度体验，享受社交，但更倾向于随性而行'},
        'EDIP': {'name': '独行侠', 'name_en': 'Solopathfinder', 'emoji': '🏔️', 'desc': '你享受独自深度探索的乐趣，喜欢按计划行事，不受干扰'},
        'EDIF': {'name': '流浪者', 'name_en': 'Wanderer', 'emoji': '🦋', 'desc': '你追求自由和深度，独来独往，随心所欲地探索世界'},
        'ESSP': {'name': '打卡达人', 'name_en': 'Spotmarker', 'emoji': '📸', 'desc': '你喜欢广撒网式游览，热爱社交分享，每一步都精心策划'},
        'ESSF': {'name': '网红旅者', 'name_en': 'Influencer', 'emoji': '🌟', 'desc': '你追求热门景点打卡，乐于社交，随性分享旅途精彩'},
        'ESIP': {'name': '摄影师', 'name_en': 'Photographer', 'emoji': '📷', 'desc': '你独爱广度游览，按计划打卡每一个景点，享受独处的拍摄时光'},
        'ESIF': {'name': '漫游者', 'name_en': 'Rambler', 'emoji': '🚶', 'desc': '你喜欢独自走马观花，随性漫步，发现意外的惊喜'},
        'CDSP': {'name': '度假达人', 'name_en': 'Vacationer', 'emoji': '🏝️', 'desc': '你偏爱舒适的深度体验，喜欢社交，享受精心安排的度假时光'},
        'CDSF': {'name': '悠闲客', 'name_en': 'Leisurer', 'emoji': '☕', 'desc': '你追求舒适的深度游，随性社交，享受惬意的旅途'},
        'CDIP': {'name': '静修者', 'name_en': 'Retreater', 'emoji': '🧘', 'desc': '你喜欢独自沉浸式体验，按计划深度放松，远离喧嚣'},
        'CDIF': {'name': '隐士', 'name_en': 'Hermit', 'emoji': '🌿', 'desc': '你追求舒适与深度，独享宁静，随心所欲地休憩'},
        'CSSP': {'name': '享乐家', 'name_en': 'Hedonist', 'emoji': '🎉', 'desc': '你热衷于舒适的打卡之旅，喜欢社交，每站都精心安排'},
        'CSSF': {'name': '休闲客', 'name_en': 'Relaxer', 'emoji': '🍰', 'desc': '你偏爱舒适的游览，随性社交，享受旅途中的每一刻'},
        'CSIP': {'name': '舒适派', 'name_en': 'Comforter', 'emoji': '🛋️', 'desc': '你喜欢独自舒适地打卡，按计划行动，享受安稳的旅途'},
        'CSIF': {'name': '佛系客', 'name_en': 'Buddha-liker', 'emoji': '🌸', 'desc': '你追求舒适随性，独来独往，走到哪算哪'}
    }
    
    key = e + d + s + p
    result = personality_map.get(key, {'name': '旅行者', 'emoji': '✈️', 'desc': '你是一个独特的旅行者'})
    
    return {
        'type': result['name'],
        'type_en': result['name_en'],
        'emoji': result['emoji'],
        'description': result['desc'],
        'code': key,
        'scores': scores
    }

@app.route('/api/map-snapshot', methods=['POST'])
def map_snapshot():
    """
    通过高德静态图API生成地图图片
    请求体: { locations: [{lng, lat, name}] }
    返回: image/png
    """
    try:
        data = request.json
        locations = data.get('locations', [])
        
        if not locations:
            return jsonify({'error': '无景点数据'}), 400
        
        amap_key = os.getenv('AMAP_API_KEY', '')
        if not amap_key:
            return jsonify({'error': '未配置高德Web服务Key'}), 500
        
        # 用 & 拼接 URL（避免 requests 对逗号和竖线进行 URL 编码）
        base = f'https://restapi.amap.com/v3/staticmap?key={amap_key}&size=750*400&scale=2'
        
        # 每个景点一个 markers 参数（用 & 拼接）
        for i, loc in enumerate(locations):
            lng = loc.get('lng')
            lat = loc.get('lat')
            base += f'&markers=mid,0xFF4757,{i+1}:{lng},{lat}'
        
        resp = http_requests.get(base, timeout=10)
        
        ct = resp.headers.get('content-type', '')
        if resp.status_code == 200 and ct.startswith('image'):
            return Response(resp.content, content_type=ct.split(';')[0])
        else:
            return jsonify({'error': '高德API返回错误', 'detail': resp.text}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8888, host='0.0.0.0')
