#!/usr/bin/bash
echo "totp\n"
curl -X POST http://localhost:8070/generate -H "Content-Type: application/json" -d'{"user_id":"test","user_nick":"qwqwqwqwqw"}' 
echo "auth-service\n"
curl -X POST http://localhost:3010/auth/register -H "Content-Type: application/json" -d'{"user":"luis","email":"luismiguelcasadodiaz@gmail.com","password":"123456789"}' 
