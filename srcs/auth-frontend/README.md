# index.html

EL body tiene una division cuyo contenido es un script de tipo module que está
en /src/main.tsx

```html
  <body>
    <div id="root"></div> <script type="module" src="/src/main.tsx"></script>
  </body>
```

# main.tsx
Importa la app desde App.tsx

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

# App.tsx
Se define :
  Un FormData para los datos del formulario
  Varios handler de eventos
    Enviar
    Borrar
    Change

Los handler definidos se mencionan en el html que la App devuelve en el interior
de la <div>

function App() {
  return ( Aqui el HTML de la página)
}