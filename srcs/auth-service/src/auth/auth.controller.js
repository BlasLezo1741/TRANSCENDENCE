"use strict";
// ¿Qué es un Controller?Un Controller en NestJS es como un recepcionista de un hotel:
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
exports.AuthController = void 0;
// Recibe las peticiones HTTP del frontend
// Las direcciona al servicio correcto
// Devuelve la respuesta al cliente
// No hace la lógica compleja (eso lo hace el Service), solo recibe y entrega.
// Interceptor: Cuando el frontend haga un fetch a /auth/register, 
// el ValidationPipe mirará el JSON.
// Validación: Si falta el email o la contraseña es corta, 
// enviará un error detallado al frontend.
// Ejecución: Si todo está bien, le pasará los datos limpios al 
// AuthService para que Drizzle los inserte en la tabla player.
// ------------------  Importaciones ---------------//
// Controller - Decorador que marca esta clase como un controlador
// Post - Decorador para definir rutas POST (envío de datos)
// Body - Decorador para extraer el cuerpo de la petición HTTP
var common_1 = require("@nestjs/common");
// Importa el servicio que tiene toda la lógica de registro.
var auth_service_1 = require("./auth.service");
// Importa el DTO que define qué datos esperas recibir.
var register_user_dto_1 = require("../dto/register-user.dto");
// @Controller('auth')` define la **ruta base** de este controlador.
// Todas las rutas de este controlador empezarán con `/auth`:
//
// http://localhost:3000/auth/...
//                      ^^^^
//                  ruta base
var AuthController = /** @class */ (function () {
    // Constructor (Inyección de dependencias)
    //¿Qué hace?
    // Recibe el AuthService (el servicio con la lógica de negocio)
    // private readonly - Crea automáticamente una propiedad privada e inmutable
    // Ahora puedes usar this.authService en cualquier método
    // Analogía: El recepcionista (Controller) tiene el teléfono directo 
    // al gerente (Service). 
    // Cuando alguien pregunta algo, el recepcionista llama al gerente.  
    function AuthController(authService) {
        this.authService = authService;
    }
    //**Define una ruta POST:**
    // Ruta completa: POST http://localhost:3000/auth/register
    //                                     ^^^^  ^^^^^^^^
    //                                 @Controller  @Post
    //Tipos de decoradores HTTP:
    //@Get('users')     → GET /auth/users
    //@Post('login')    → POST /auth/login
    //@Put('update')    → PUT /auth/update
    //@Delete('delete') → DELETE /auth/delete
    //@Patch('edit')    → PATCH /auth/edit
    AuthController.prototype.register = function (registerUserDto) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Si los datos no cumplen el DTO, NestJS responderá 400 antes de llegar aquí
                return [2 /*return*/, this.authService.register(registerUserDto)];
            });
        });
    };
    __decorate([
        (0, common_1.Post)('register') // Endpoint: POST /auth/register
        //async register()
        //El método es asíncrono porque llama a un servicio que hace operaciones 
        // async (base de datos, HTTP, etc.)
        //@Body() registerUserDto: RegisterUserDto
        //@Body() extrae el cuerpo de la petición HTTP.
        ,
        __param(0, (0, common_1.Body)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [register_user_dto_1.RegisterUserDto]),
        __metadata("design:returntype", Promise)
    ], AuthController.prototype, "register", null);
    AuthController = __decorate([
        (0, common_1.Controller)('auth') // La ruta base será http://localhost:3000/auth
        ,
        __metadata("design:paramtypes", [auth_service_1.AuthService])
    ], AuthController);
    return AuthController;
}());
exports.AuthController = AuthController;
