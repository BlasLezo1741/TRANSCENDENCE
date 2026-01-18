from fastapi import FastAPI
from pydantic import BaseModel
import totp

app = FastAPI()

class TotpRequest(BaseModel):
    user_id: int  # NestJS envía newUser.pPk (que es un número)
    user_nick: str # NestJS envía newUser.pNick (que es una cadena)

@app.get("/")
async def root():
    return {"message": "Hola mundo"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/generate")
async def generate_totp(request: TotpRequest):
    return {"status": "ok"}

@app.get("/random")
async def random():
    
    return {"key": totp.create_random_key()}