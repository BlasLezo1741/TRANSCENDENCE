# Test the stress al backend

Está hecho en Python.
Necesitas instalar algunas librerias.

Lee al final cómo crear un entorno virtual para estas pruebas


## Generación de usuarios para el test de stress


Como tu tienes tu base de datos, tiene que crear usuarios nuevos para los que te sepas el password.

Eso te lo hace el script python "test_register_ui.py"

En la pantalla abajo ves que crea 5 usuarios por defecto.
ponle 60 y así los tienes. 

Por defecto crear un 20% con 2fa. Para tu ejercicio pon 0.
Tarda un ratito. Vete a tomar café.

Los usuarioas los deja en el fichero pong_users_ui.csv

```bash
./tests/test_register_ui.py

╔══════════════════════════════════════════════════════╗
║   Pong — Registration UI Test  (Playwright / nginx)  ║
╚══════════════════════════════════════════════════════╝

  Server IP [127.0.0.1]: 
  Number of users (0 = diagnostic) [5]: 
  Percentage with 2FA (0-100) [20]: 0
  Show browser window? (y/n) [n]: y

┌──────────────────────────────────────────────────────┐
│  Entry point : https://127.0.0.1:8443               │
│  Users       : 5                                    │
│  With 2FA    : 0 (0 %)                              ││
│  Browser     : visible                              │
│  Output CSV  : pong_users_ui.csv                    │
└──────────────────────────────────────────────────────┘

  Preflight — checking backend via nginx...
  GET https://127.0.0.1:8443/auth/countries … ✓  249 countries loaded

```
## 60 logins simultáneos

El scrit the python "stress_remote_game.py" permite crear sesiones. Empieza con 6 usuarios simultaneos y ves subiendo.

Cada sesion, independientemente, hace esto:


    1. Loads the frontend
    2. Authenticates
    3. Clicks "player vs remote"  ->  join_queue emitted to backend
    4. Waits for match_found      ->  backend paired this user with someone
    5. Waits for game_over        ->  best of 5 finished
    6. Closes context and records result


```
$./stress_remote_game.py

=========================================================
   Pong -- Remote Queue Stress Test
=========================================================

  Server IP [127.0.0.1]: 
  Users CSV [pong_users_ui.csv]: 
  Max users (0 = all) [4]: 
  Show browsers? (y/n) [y]: 


  Frontend     : https://127.0.0.1:8443
  Users        : 4  (2 expected matches)
  Browsers     : visible  (3x2 grid, 640x400 each)
  Output       : stress_results.csv

    6 browsers launched — firing 4 sessions concurrently...
```

Espero que esto te ayude con las pruebas.

```
=========================================================
   Pong -- Remote Queue Stress Test
=========================================================

  Server IP [127.0.0.1]: 
  Users CSV [pong_users_ui.csv]: 
  Max users (0 = all) [4]: 
  Show browsers? (y/n) [y]: 

  Frontend     : https://127.0.0.1:8443
  Users        : 4  (2 expected matches)
  Browsers     : visible  (3x2 grid, 640x400 each)
  Output       : stress_results.csv

  6 browsers launched — firing 4 sessions concurrently...

    #  username              login  match  over   q_wait    game   total  status
  ---------------------------------------------------------------------------
    0  play_ksj1cjn            Y      N      N      0.0s    0.0s   62.0s  FAILED  [match_found not received after 60s]
    1  play_t92tmd3            Y      Y      Y      0.2s   21.7s   24.2s  OK
    2  play_piz5zal            Y      Y      Y      0.1s   21.7s   24.2s  OK
    3  play_48sqka1            Y      N      N      0.0s    0.0s   62.7s  FAILED  [match_found not received after 60s]

=========================================================
  STRESS TEST RESULTS
=========================================================
  Users launched   : 4
  Logged in        : 4
  Matchs          : 2  (4 players paired)
  Game over        : 2
  Full OK          : 2
  Failed           : 2
  Total elapsed    : 67.9s
  Output CSV       : /home/lcasado/Documents/coding/c/42/cc/circle7/TRANSCENDENCE/tests/stress_results.csv
=========================================================

```


# Imágenes de las ejecuciones

En screenshots se guarda una captura de la pantalla la creación de una cuenta.



# Entorno virtual python 

### 1. Crear un entorno virtual

Esto crea una "burbuja" aislada para tu proyecto.

    En Windows:
    Bash

    python -m venv stress_test

    En macOS / Linux:
    Bash

    python3 -m venv stress_test

### 2. Activar el entorno

Debes decirle a tu terminal que use esa "burbuja".

    En Windows:
    Bash

    stress_test\Scripts\activate

    En macOS / Linux:
    Bash

    source stress_test/bin/activate

(Sabrás que funcionó porque verás (stress_test) al principio de tu línea de comandos).

### 3. Instalar las librerías

Ahora sí, ejecuta el comando mágico que lee el archivo e instala todo automáticamente:
Bash

pip install -r requirements.txt