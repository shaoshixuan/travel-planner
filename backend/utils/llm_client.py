from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

class LLMClient:
    def __init__(self):
        api_key = os.getenv('ZHIPU_API_KEY', '')
        if not api_key:
            raise ValueError("ZHIPU_API_KEY environment variable is not set")
        
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.siliconflow.cn/v1"
        )
        self.model = "Pro/zai-org/GLM-4.7"
    
    def generate(self, prompt, system_prompt="你是一位专业的旅行规划师，擅长根据用户需求制定个性化旅游攻略。"):
        """调用硅基流动API生成内容"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"LLM调用失败: {str(e)}")

# 单例实例
llm_client = None

def get_llm_client():
    global llm_client
    if llm_client is None:
        llm_client = LLMClient()
    return llm_client
