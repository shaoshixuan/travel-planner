import requests
import os
from dotenv import load_dotenv
import time

load_dotenv()

class MapClient:
    def __init__(self):
        self.api_key = os.getenv('AMAP_API_KEY', '')
        self.base_url = "https://restapi.amap.com/v3"
    
    def geocode(self, address, city=""):
        """地址转经纬度坐标"""
        url = f"{self.base_url}/geocode/geo"
        params = {
            "key": self.api_key,
            "address": address,
            "city": city
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == '1' and data.get('geocodes'):
                location = data['geocodes'][0]['location']
                lng, lat = location.split(',')
                return {
                    'success': True,
                    'lng': float(lng),
                    'lat': float(lat),
                    'formatted_address': data['geocodes'][0].get('formatted_address', address)
                }
            return {'success': False, 'error': '地址解析失败'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def batch_geocode(self, addresses, city=""):
        """批量地址转坐标"""
        results = []
        for addr in addresses:
            result = self.geocode(addr, city)
            results.append({
                'address': addr,
                **result
            })
            time.sleep(0.1)  # 避免请求过快
        return results
    
    def get_driving_route(self, origin, destination):
        """获取驾车路线规划"""
        url = f"{self.base_url}/direction/driving"
        params = {
            "key": self.api_key,
            "origin": origin,
            "destination": destination,
            "strategy": 0  # 推荐策略
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == '1' and data.get('route'):
                path = data['route']['paths'][0]
                return {
                    'success': True,
                    'distance': int(path['distance']),
                    'duration': int(path['duration']),
                    'steps': path.get('steps', [])
                }
            return {'success': False, 'error': '路线规划失败'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_walking_route(self, origin, destination):
        """获取步行路线规划"""
        url = f"{self.base_url}/direction/walking"
        params = {
            "key": self.api_key,
            "origin": origin,
            "destination": destination
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == '1' and data.get('route'):
                path = data['route']['paths'][0]
                return {
                    'success': True,
                    'distance': int(path['distance']),
                    'duration': int(path['duration']),
                    'steps': path.get('steps', [])
                }
            return {'success': False, 'error': '路线规划失败'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_transit_route(self, origin, destination, city):
        """获取公交/地铁路线规划"""
        url = f"{self.base_url}/direction/transit/integrated"
        params = {
            "key": self.api_key,
            "origin": origin,
            "destination": destination,
            "city": city,
            "strategy": 1  # 推荐方案
        }
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == '1' and data.get('route'):
                transits = data['route'].get('transits', [])
                if transits:
                    transit = transits[0]
                    return {
                        'success': True,
                        'distance': int(transit.get('distance', 0)),
                        'duration': int(transit.get('duration', 0)),
                        'walking_distance': int(transit.get('walking_distance', 0)),
                        'cost': float(transit.get('cost', 0)),
                        'segments': transit.get('segments', [])
                    }
            return {'success': False, 'error': '公交路线规划失败'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

# 单例实例
map_client = None

def get_map_client():
    global map_client
    if map_client is None:
        map_client = MapClient()
    return map_client
