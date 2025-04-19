# fairusebot/app.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fairusebot.chat_agent import get_fair_use_response


app = FastAPI()

# CORS setup to allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    query: str

@app.post("/chat")
async def chat(message: Message):
    response = get_fair_use_response(message.query)
    return {"response": response}
