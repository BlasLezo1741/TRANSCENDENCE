## ¿Bcrypt en el Backend o Stored Procedure en Postgres?

En la arquitectura moderna y bajo el requisito de Microservicios, lo más recomendable es utilizar bcrypt en el Backend (NestJS). Aquí te explico por qué:

+ **Escalabilidad**: El cifrado de contraseñas es una tarea intensiva para la CPU. Si delegas esto a la base de datos, estás consumiendo recursos valiosos del motor de datos. Es mucho más fácil y barato escalar horizontalmente tus contenedores de NestJS que escalar tu instancia de Postgres.

+ **Seguridad del Dato en Tránsito**: Si cifras en el backend, la contraseña "en claro" nunca llega a la base de datos. Si usas una Stored Procedure, la contraseña viaja por la red (aunque sea interna) hasta llegar a la DB para ser procesada.

+ **Portabilidad**: Si el día de mañana decides cambiar Postgres por otra base de datos, no pierdes tu lógica de seguridad porque está en el código (auth.service.ts), no en procedimientos almacenados específicos del motor SQL.

+ **Separación de Responsabilidades**: El principio de microservicios dicta que la lógica de negocio (como el hash de seguridad) debe vivir en el servicio, mientras que la base de datos debe ser solo una capa de persistencia inteligente.



# ¿Qué es una Promise?
Una Promise (promesa) es un objeto de JavaScript que representa una operación asíncrona que eventualmente se completará (o fallará).

**Analogía**: Pides una pizza por teléfono. Te dan un número de pedido (la Promise). Eventualmente recibirás la pizza (resolve) o te dirán que no hay ingredientes (reject).

```javascript
javascript// Crear una Promise
const promesa = fetch('https://api.ejemplo.com/datos');

// Usar la Promise con async/await
const respuesta = await promesa;
const datos = await respuesta.json();

// O con .then()
promesa
  .then(respuesta => respuesta.json())
  .then(datos => console.log(datos))
  .catch(error => console.error(error));

```
## Características clave:
+ Devuelve UN SOLO VALOR (una sola pizza)
+ Se completa una vez y termina
+ Puedes usar await con ellas


# ¿Qué es un Observable (RxJS)?
Un Observable es como una Promise pero más poderoso. 
Es un flujo de datos que puede emitir **múltiples valores a lo largo del tiempo**.
Analogía: En lugar de pedir una pizza (un solo valor), te suscribes a un servicio de pizzas mensuales. 

Recibirás pizzas cada mes (múltiples valores).

```javascript
import { Observable } from 'rxjs';

// Crear un Observable
const observable = new Observable(subscriber => {
  subscriber.next('Primer valor');
  subscriber.next('Segundo valor');
  setTimeout(() => {
    subscriber.next('Tercer valor después de 1 seg');
    subscriber.complete();
  }, 1000);
});

// Suscribirse al Observable
observable.subscribe({
  next: valor => console.log(valor),
  complete: () => console.log('Terminado')
});
```

// Salida:
// "Primer valor"
// "Segundo valor"
// (espera 1 segundo)
// "Tercer valor después de 1 seg"
// "Terminado"

## Características clave:

+ Puede emitir MÚLTIPLES VALORES a lo largo del tiempo
+ Es como un "stream" (flujo) de datos
+ Necesitas suscribirte para recibir los valores
+ NO puedes usar await directamente con Observables


#El problema en tu código

```javascript
import { HttpService } from '@nestjs/axios';

// HttpService usa Observables (no Promises)
const resultado = this.httpService.post(url, datos);
// resultado es un Observable, NO una Promise
```
NestJS usa Axios, y la versión de NestJS (@nestjs/axios) devuelve Observables en lugar de Promises porque usa RxJS internamente.

Problema: No puedes usar await con Observables
```javascript
// ❌ ESTO NO FUNCIONA
const response = await this.httpService.post(url, datos);
// Error: await solo funciona con Promises, no con Observables
```

## La solución: firstValueFrom

```javascript
import { firstValueFrom } from 'rxjs';

// Convertir Observable → Promise
const response = await firstValueFrom(
  this.httpService.post(url, datos)
);
```

## ¿Qué hace firstValueFrom?

Toma un Observable y:

+ Espera al primer valor que emita
+ Lo convierte en una Promise
+ Se completa inmediatamente (no espera más valores)

**Analogía**: De tu suscripción mensual de pizzas, solo tomas la primera pizza y cancelas la suscripción.

### Comparación visual
#### Observable (múltiples valores)
```javascript
import { interval } from 'rxjs';
import { take } from 'rxjs/operators';

// Observable que emite cada segundo
const observable = interval(1000).pipe(take(3));

observable.subscribe(valor => console.log(valor));

// Salida:
// 0 (después de 1 seg)
// 1 (después de 2 seg)
// 2 (después de 3 seg)
```
#### Promise (un solo valor)
```javascript
const promesa = new Promise(resolve => {
  setTimeout(() => resolve('Un solo valor'), 1000);
});

promesa.then(valor => console.log(valor));

// Salida:
// "Un solo valor" (después de 1 seg)
```
#### firstValueFrom (Observable → Promise)
```javascript
import { interval, firstValueFrom } from 'rxjs';

const observable = interval(1000); // Emitiría infinitamente

const promesa = firstValueFrom(observable);

promesa.then(valor => console.log(valor));

// Salida:
// 0 (después de 1 seg, y se detiene)
```
#### En tu código específico
```javascript
const { data } = await firstValueFrom(
  this.httpService.post(pythonUrl, {
    user_id: newUser.p_pk,
    user_nick: newUser.p_nick
  })
);
```
##### Paso a paso:

+ this.httpService.post(...) → Devuelve un Observable
+ firstValueFrom(...) → Convierte ese Observable en una Promise
+ await ... → Espera a que la Promise se resuelva
+ const { data } → Extrae la propiedad data de la respuesta


## Alternativas a firstValueFrom
Hay otras formas de convertir Observables:
### 1. lastValueFrom - Espera al último valor
```javascript
import { lastValueFrom } from 'rxjs';

const promesa = lastValueFrom(observable);
// Espera hasta que el Observable se complete y toma el último valor
```

### 3. Usar .subscribe() directamente
```javascript
this.httpService.post(url, datos).subscribe({
  next: (response) => {
    console.log('Datos:', response.data);
  },
  error: (error) => {
    console.error('Error:', error);
  }
});
```

## ¿Por qué existen los Observables si son más complejos?
Los Observables son más potentes para ciertos casos:
### Ejemplo 1: Autocompletado en buscador
```javascript
import { fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

// Captura lo que el usuario escribe
const input = document.getElementById('search');
const observable = fromEvent(input, 'input');

observable.pipe(
  debounceTime(300), // Espera 300ms después de que deje de escribir
  distinctUntilChanged(), // Solo si cambió el texto
  switchMap(event => fetch(`/api/search?q=${event.target.value}`))
).subscribe(resultados => {
  // Muestra resultados
});
```

Con Promises esto sería mucho más complicado.

### Ejemplo 2: WebSockets (datos en tiempo real)
```javascript
// Observable que recibe mensajes continuamente
const mensajes$ = webSocket('ws://servidor.com');

mensajes$.subscribe(mensaje => {
  console.log('Nuevo mensaje:', mensaje);
});
// Recibe MÚLTIPLES mensajes a lo largo del tiempo
```

### Resumen

|Concepto|Promise|Observable|
|---------|-------|---------|
|Valores|1 solo valor|Múltiples valores|
|Cuándo termina|Una vez|Puede continuar indefinidamente|
|Cancelable|❌ No|✅ Sí (con .unsubscribe())|
|Uso con await|✅ Sí|❌ No (necesita conversión)|
|Lazy|❌ Se ejecuta inmediatamente|✅ Solo se ejecuta al suscribirse|

`firstValueFrom` es el puente que convierte:

+ Observable (múltiples valores, necesita suscripción)
+ → Promise (un valor, funciona con await)