"use strict";
// Injectable - Decorador que marca esta clase como un servicio que puede ser inyectado en otros lugares
// Inject - Para inyectar dependencias (recursos que necesita este servicio)
// InternalServerErrorException - Para manejar errores del servidor (error 500)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
// Importa el tipo de base de datos. Drizzle es un ORM 
// (Object-Relational Mapping), una herramienta que te permite hablar con la 
// base de datos usando JavaScript en lugar de SQL puro.
var node_postgres_1 = require("drizzle-orm/node-postgres");
// Importa el esquema de tu base de datos (las definiciones de tus tablas.
var schema = __importStar(require("../schema"));
// HttpService - Para hacer peticiones HTTP a otros servicios (en este caso, 
// al microservicio Python)
// firstValueFrom - Convierte un Observable de RxJS en una Promise 
// (para usar await)
var axios_1 = require("@nestjs/axios");
var rxjs_1 = require("rxjs");
// bcrypt - Librería para encriptar contraseñas de forma segura.
var bcrypt = __importStar(require("bcrypt"));
// @Injectable() - Decorador dice "el servicio puede ser usado en otros lugares"
// Es una clase que contiene la lógica de autenticación
var AuthService = /** @class */ (function () {
    // El constructor recibe las "herramientas" que necesita:
    // db - La conexión a la base de datos (inyectada con el nombre 'DRIZZLE_CONNECTION')
    // httpService - Para hacer peticiones HTTP
    function AuthService(db, httpService) {
        this.db = db;
        this.httpService = httpService;
    }
    // async - Esta función es asíncrona (espera respuestas de la base de datos y 
    // otros servicios)
    // dto - Los datos que vienen del frontend (user, email, password)
    AuthService.prototype.register = function (dto) {
        return __awaiter(this, void 0, void 0, function () {
            var salt, hashedPassword, newUser, pythonUrl, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        return [4 /*yield*/, bcrypt.genSalt()];
                    case 1:
                        salt = _a.sent();
                        return [4 /*yield*/, bcrypt.hash(dto.password, salt)];
                    case 2:
                        hashedPassword = _a.sent();
                        return [4 /*yield*/, this.db.insert(schema.player).values({
                                p_nick: dto.user,
                                p_mail: dto.email,
                                p_pass: hashedPassword,
                                p_reg: new Date(),
                            }).returning()];
                    case 3:
                        newUser = (_a.sent())[0];
                        pythonUrl = 'http://totp:8000/generate';
                        return [4 /*yield*/, (0, rxjs_1.firstValueFrom)(this.httpService.post(pythonUrl, {
                                user_id: newUser.p_pk,
                                user_nick: newUser.p_nick
                            }))];
                    case 4:
                        data = (_a.sent()).data;
                        if (!data.secret) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.db.update(schema.player)
                                .set({ p_totp_secret: data.secret })
                                .where(schema.player.p_pk.equals(newUser.p_pk))];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: 
                    // 5. Devolver al frontend los datos necesarios (como el QR)
                    // Devuelve un objeto con:
                    // + Un mensaje de éxito
                    // + El ID del usuario
                    // + El código QR (probablemente en base64) para que el frontend lo muestre
                    return [2 /*return*/, {
                            message: 'Usuario registrado con éxito',
                            userId: newUser.p_pk,
                            qrCode: data.qr_code, // El string base64 o URL que genera tu Python
                        }];
                    case 7:
                        error_1 = _a.sent();
                        console.error('Error en el registro:', error_1);
                        throw new common_1.InternalServerErrorException('No se pudo completar el registro');
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    AuthService = __decorate([
        (0, common_1.Injectable)(),
        __param(0, (0, common_1.Inject)('DRIZZLE_CONNECTION')),
        __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
            axios_1.HttpService])
    ], AuthService);
    return AuthService;
}());
exports.AuthService = AuthService;
