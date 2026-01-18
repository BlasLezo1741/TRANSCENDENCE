"use strict";
// NestFactory es una clase especial que se encarga de crear tu aplicación 
// NestJS. Es como el "constructor de aplicaciones".
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@nestjs/core");
// ValidationPipe es un "pipe" (tubería) que valida automáticamente los datos 
// que llegan a tu backend. Verifica que sean correctos antes de procesarlos.
var common_1 = require("@nestjs/common");
// Importa el módulo principal de tu aplicación. En NestJS todo se organiza 
// en módulos, y AppModule es el módulo raíz que contiene todo lo demás.
var app_module_1 = require("./app.module");
// Es una función asíncrona que arranca (bootstrap = arrancar) tu aplicación. 
// Es el punto de partida de todo tu backend.
function bootstrap() {
    return __awaiter(this, void 0, void 0, function () {
        var app, port;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, core_1.NestFactory.create(app_module_1.AppModule)];
                case 1:
                    app = _a.sent();
                    port = process.env.PORT || 3010;
                    // Habilitar CORS para que el frontend pueda conectar
                    // Como tu frontend corre en el puerto 5174 y el backend en el 3000, 
                    // el navegador bloqueará la petición por seguridad (CORS error). 
                    // Debes habilitarlo en el backend.
                    app.enableCors({
                        origin: 'http://localhost:5174', // URL de tu frontend de prueba
                        methods: 'GET,POST',
                        credentials: true,
                    });
                    // Esto activa la validación automática usando el DTO que creamos
                    // Configurar ValidationPipe (Validación automática)
                    // Esta es una configuración MUY IMPORTANTE para seguridad y validación.
                    // whitelist: true
                    // ¿Qué hace? NestJS elimina los campos que NO estén definidos en tu DTO.
                    // 
                    // forbidNonWhitelisted: true
                    // ¿Qué hace? NestJS lanza un error si detecta campos que no deberían estar.
                    //
                    // `transform: true`
                    // ¿Qué hace? Convierte automáticamente los tipos de datos al tipo correcto.
                    app.useGlobalPipes(new common_1.ValidationPipe({
                        whitelist: true,
                        forbidNonWhitelisted: true,
                        transform: true,
                    }));
                    // Inicia el servidor en el puerto 3000
                    // await espera a que el servidor esté listo
                    // Después de esto, tu API está funcionando en http://localhost:3000
                    return [4 /*yield*/, app.listen(port)];
                case 2:
                    // Inicia el servidor en el puerto 3000
                    // await espera a que el servidor esté listo
                    // Después de esto, tu API está funcionando en http://localhost:3000
                    _a.sent();
                    console.log("\uD83D\uDE80 Servidor corriendo en http://localhost:3000");
                    return [2 /*return*/];
            }
        });
    });
}
bootstrap();
