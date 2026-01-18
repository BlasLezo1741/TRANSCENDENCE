"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterUserDto = void 0;
var class_validator_1 = require("class-validator");
var RegisterUserDto = /** @class */ (function () {
    function RegisterUserDto() {
    }
    __decorate([
        (0, class_validator_1.IsString)(),
        (0, class_validator_1.IsNotEmpty)({ message: 'El nombre de usuario es obligatorio' }),
        (0, class_validator_1.MaxLength)(20, { message: 'El nick no puede exceder los 20 caracteres' }),
        __metadata("design:type", String)
    ], RegisterUserDto.prototype, "user", void 0);
    __decorate([
        (0, class_validator_1.IsEmail)({}, { message: 'El formato del email no es válido' }),
        (0, class_validator_1.IsNotEmpty)({ message: 'El email es obligatorio' }),
        __metadata("design:type", String)
    ], RegisterUserDto.prototype, "email", void 0);
    __decorate([
        (0, class_validator_1.IsString)(),
        (0, class_validator_1.IsNotEmpty)({ message: 'La contraseña es obligatoria' }),
        (0, class_validator_1.MinLength)(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
        __metadata("design:type", String)
    ], RegisterUserDto.prototype, "password", void 0);
    return RegisterUserDto;
}());
exports.RegisterUserDto = RegisterUserDto;
