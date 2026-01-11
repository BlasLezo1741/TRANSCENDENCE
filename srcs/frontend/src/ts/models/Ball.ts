//import { Player } from "./Player.ts";

export class Ball
{
    x: number;
    y: number;
    radious: number; //radious deberia ser radius en ingles
    canvasWidth: number;
    canvasHeight: number;

    constructor(c: HTMLCanvasElement)
    {
        this.canvasWidth = c.width;
        this.canvasHeight = c.height;
        
        // Posición inicial (centro)
        this.x = c.width / 2;
        this.y = c.height / 2;

        // Radio relativo al ancho (ej. 1% del ancho) o fijo
        // Si en backend es 0.02 (2%), aquí debería ser similar visualmente.
        // 0.02 * width / 2 (porque es radio) = 0.01 * width
        this.radious = c.width * 0.015;
    }
        // Método para dibujar (Lo único que hace ahora)
    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radious, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();
    }

    /**
     * SINCRONIZACIÓN (La clave del nuevo sistema)
     * Recibe coordenadas normalizadas del servidor (0.0 a 1.0)
     * y las convierte a píxeles de la pantalla del usuario.
     */
    sync(serverX: number, serverY: number) {
        this.x = serverX * this.canvasWidth;
        this.y = serverY * this.canvasHeight;
    }
}