// Importa el hook useState de React. 
// Los hooks son funciones especiales que permiten usar características de React
// en componentes funcionales.
// Los hooks son funciones especiales de React que te permiten "engancharte" 
// (hook = gancho en inglés) a características de React desde componentes funcionales.
// MUY IMPORTANTE - Siempre debes seguir estas reglas:
// Solo llamar hooks en el nivel superior - NO dentro de loops, condiciones o funciones anidadas
// Solo llamar hooks en componentes React - O en custom hooks
import { useState } from 'react';

// Creas un componente funcional llamado App. 
// Es una función normal que retorna JSX (HTML + JavaScript).
function App() {
  //Esto es CLAVE en React:

  // useState crea una variable de estado que React observa
  // formData    - Variable con los datos del formulario (un objeto con 
  //               3 propiedades vacías)
  // setFormData - Función para actualizar formData

  // Cuando llamas setFormData, React re-renderiza el componente automáticamente

  //  Piénsalo así: cuando cambia esta variabel especial, 
  // React actualiza la página automáticamente.

  const [formData, setFormData] = useState({
    user: '',
    email: '',
    password: ''
  });


  const [message, setMessage] = useState('');
  const [qrCode, setQrCode] = useState(''); // Para guardar el QR de Python
/*
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Enviando...');

    try {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('¡Usuario registrado con éxito!');
        setQrCode(data.qrCode); // El backend devuelve { qrCode: "base64..." }
      } else {
        // Manejo de errores del ValidationPipe de NestJS
        setMessage(`Error: ${data.message || 'No se pudo registrar'}`);
      }
    } catch (error) {
      setMessage('Error de conexión con el servidor');
    }
  };

  return (
    <div style={{ padding: '40px', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Registro de Prueba (Microservicios)</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input type="text" placeholder="Usuario" onChange={e => setFormData({...formData, user: e.target.value})} required />
        <input type="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
        <input type="password" placeholder="Contraseña" onChange={e => setFormData({...formData, password: e.target.value})} required />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Registrar</button>
      </form>

      {message && <p style={{ marginTop: '20px', color: '#00ff00' }}>{message}</p>}

      {qrCode && (
        <div style={{ marginTop: '20px' }}>
          <h3>Escanea tu 2FA:</h3>
          <img src={qrCode} alt="QR Code 2FA" style={{ border: '10px solid white' }} />
        </div>
      )}
    </div>
  );
}
*/

  // Se ejecuta cada vez que escribes en un input:

  // e - El evento del input
  // e.target.name - El nombre del input ("user", "email" o "password")
  // e.target.value - Lo que escribiste
  // { ...formData, [e.target.name]: e.target.value } - Spread operator que:

  // Copia todo lo que había en formData (...formData)
  // Actualiza solo el campo que cambió ([e.target.name]: e.target.value)



  // Ejemplo: Si escribes "Juan" en el input user:
  // Antes: { user: '', email: '', password: '' }
  // Después: { user: 'Juan', email: '', password: '' }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Simplemente resetea todos los campos a vacío. 
  // Se ejecuta cuando haces clic en "Borrar".
  const handleBorrar = () => {
    setFormData({ user: '', email: '', password: '' });
  };

  // async - Indica que esta función hace operaciones asíncronas 
  // (espera respuestas)
  // e.preventDefault() - Importante: Evita que el formulario recargue la página 
  // (comportamiento por defecto del HTML)
  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Enviando datos a NestJS:", formData);
    // Lee una variable de entorno llamada VITE_AUS_API_URL 
    // (probablemente la URL de tu backend, ej: "http://localhost:3000")
    const backendUrl = import.meta.env.VITE_AUS_API_URL;    
    // Aquí haremos el fetch a NestJS más adelante
    try {
      // fetch() - Hace una petición HTTP al servidor
      // await - Espera a que el servidor responda antes de continuar
      // Template literal con ${} para insertar la URL
      // POST - Tipo de petición (enviar datos)
      // headers - Le dice al servidor que envías JSON
      // JSON.stringify(formData) - Convierte tu objeto JavaScript a texto JSON
      const response = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      // Si todo va bien: convierte la respuesta a JSON y la muestra en consola
      // Si hay error: lo captura y muestra en consola
      const data = await response.json();
      console.log("Respuesta del servidor:", data);
    } catch (error) {
      console.error("Error al conectar con el backend:", error);
    }
  };
  // El return devuelve lo que se va a mostrar en pantalla. 
  // Los estilos inline usan doble llave: {{ }} 
  // (una para JSX, otra para el objeto JavaScript).

  // Cuando envías el formulario (Enter o clic en "Enviar"), ejecuta handleEnviar.

  // Input controlado por React:

  // value={formData.user} - El valor viene del estado
  // onChange={handleChange} - Cada cambio actualiza el estado
  // Esto hace que React sea la "fuente de verdad" de los datos

  // type="submit" - Activa el onSubmit del form
  // type="button" - No envía el form, solo ejecuta onClick
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Registro de Usuario (Prueba 2FA)</h1>
      <form onSubmit={handleEnviar} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input name="user" placeholder="Usuario" value={formData.user} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ backgroundColor: '#4CAF50', color: 'white' }}>Enviar</button>
          <button type="button" onClick={handleBorrar} style={{ backgroundColor: '#f44336', color: 'white' }}>Borrar</button>
        </div>
      </form>
    </div>
  );
} // del componente funcional App

// Exporta el componente para que main.tsx pueda importarlo.
export default App;
