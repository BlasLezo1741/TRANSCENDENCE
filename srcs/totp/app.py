from fastapi import FastAPI
from pydantic import BaseModel
import totp

app = FastAPI()

class TotpRequest(BaseModel):
    user_id: int  # NestJS envía newUser.pPk (que es un número)
    user_nick: str # NestJS envía newUser.pNick (que es una cadena)


class TotpqrRequest(BaseModel):
    user_totp_secret: str  # NestJS envía newUser.pTotpSecret (que es una cadena)
    user_nick: str # NestJS envía newUser.pNick (que es una cadena)
    user_mail: str  # NestJS envía newUser.pMail (que es una cadena)

class TotpVerifyRequest(BaseModel):
    user_totp_secret: str # String Base32: "I5NGEPK4GJ..."
    totp_code: str  # NestJS envía el código TOTP que el usuario ingresa para verificar



@app.get("/")
async def root():
    return {"message": "Hola mundo"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/generate")
async def generate_totp(request: TotpRequest):
    print(f"📥 PETICIÓN RECIBIDA: Generando TOTP para {request.user_nick}")
    return {"status": "ok"}

@app.get("/random")
async def random():
    
    return {"totpkey": totp.create_random_key()}

@app.post("/qrtext")
async def qrtext(request: TotpqrRequest):
    
    return {"qr_text": totp.generate_qr(request.user_totp_secret, 
                                        request.user_nick, 
                                        request.user_mail)}

@app.post("/verify")
async def verify_totp(request: TotpVerifyRequest):
    currentcode = totp.get_totp_token(request.user_totp_secret)
    print(f"type(request.totp_code) = {type(request.totp_code)} - request.totp_code = {request.totp_code} ")
    print(f"type(currentcode) = {type(currentcode)} - currentcode = {currentcode} ")
    
    if currentcode == request.totp_code:
        print(f"correcta Verificando TOTP para {request.totp_code} con {request.user_totp_secret}")
        return {"status": "ok", "verified": True}
    else:
        print(f"incorrecta Verificando TOTP para {request.totp_code} con {request.user_totp_secret}")
        return {"status": "error", "verified": False    }