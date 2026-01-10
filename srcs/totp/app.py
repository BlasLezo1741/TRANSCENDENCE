from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hola mundo"}

@app.get("/health")
async def health():
    return {"status": "ok"}