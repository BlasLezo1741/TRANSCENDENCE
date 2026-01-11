from fastapi import FastAPI
import totp

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hola mundo"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/random")
async def random():
    
    return {"key": totp.create_random_key()}