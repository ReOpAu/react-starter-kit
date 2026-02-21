"""Cartesia Line voice agent for address finding."""

import os

from line.llm_agent import LlmAgent, LlmConfig, end_call
from line.voice_agent_app import VoiceAgentApp

from config import INTRODUCTION, LLM_MODEL, LLM_TEMPERATURE, SYSTEM_PROMPT
from tools import ALL_TOOLS


async def get_agent(env, call_request):
    return LlmAgent(
        model=LLM_MODEL,
        api_key=os.getenv("GEMINI_API_KEY"),
        tools=[*ALL_TOOLS, end_call],
        config=LlmConfig(
            system_prompt=SYSTEM_PROMPT,
            introduction=INTRODUCTION,
            temperature=LLM_TEMPERATURE,
        ),
    )


app = VoiceAgentApp(get_agent=get_agent)

if __name__ == "__main__":
    app.run()
