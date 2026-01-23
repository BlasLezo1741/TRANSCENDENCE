// Importa el hook useState de React. 
// Los hooks son funciones especiales que permiten usar características de React
// en componentes funcionales.
// Los hooks son funciones especiales de React que te permiten "engancharte" 
// (hook = gancho ) a características de React desde componentes funcionales.
// MUY IMPORTANTE - Siempre debes seguir estas reglas con los Hooks:
// Llamar en el nivel superior - NO en loops, condiciones o funciones anidadas
// Llamar en componentes React - O en custom hooks
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react'; // Importamos el generador de QR

// Creas un componente funcional llamado App. 
// Es una función normal que retorna JSX (HTML + JavaScript).
function App() {

  // ===========================================================================
  // CONFIGURACIÓN
  // ===========================================================================


  // Lee una variable de entorno llamada VITE_AUS_API_URL 
  // "http://localhost:3010")
  const backendUrl = import.meta.env.VITE_AUS_API_URL;  

  // ===========================================================================
  // ESTADOS (variables que React observa)
  // ===========================================================================

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
  const [isLoading, setIsLoading] = useState(false);


  // ===========================================================================
  // FUNCIONES (handlers)
  // ===========================================================================

  // ============= Se ejecuta cada vez que escribes en un input ================
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
    setFormData({ 
      ...formData,                    // Copia todo lo anterior
      [e.target.name]: e.target.value // Actualiza solo el campo que cambió
    });
  };

  // ================= Limpia todos los campos =================================
  // Se ejecuta cuando haces clic en "Borrar".
  const handleBorrar = () => {
    setFormData({ user: '', email: '', password: '' });
    setMessage('');
    setQrCode('');
  };

  // =================  Envía el formulario al backend ========================
  // async - Indica que esta función hace operaciones asíncronas 
  // (espera respuestas)
  // e.preventDefault() - Importante: Evita que el formulario recargue la página 
  // (comportamiento por defecto del HTML)   
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);  // ← Input se DESHABILITA
    setMessage('Enviando...');
    console.log("Enviando datos a NestJS:", formData);
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
        body: JSON.stringify(formData),
      });
      // Si todo va bien: convierte la respuesta a JSON y la muestra en consola
      // Si hay error: lo captura y muestra en consola
      const data = await response.json();
      if (response.ok) {
        setMessage('¡Usuario registrado con éxito!');
        // Si el backend envía un QR code para 2FA        
        if (data.qrCode)
        {
          setQrCode(data.qrCode); // El backend devuelve { qrCode: "base64..." }
        }

      } else {
        // Manejo de errores del ValidationPipe de NestJS
        const errorMsg = Array.isArray(data.message) 
        ? data.message.join(', ') 
        : data.message || 'error Descnonicido';

        
        setMessage(`Error: ${errorMsg} || 'No se pudo registrar'}`);
      }
    } catch (error) {
      setMessage('Error de conexión con el servidor');
      console.error("Error al conectar con el backend:", error);
    } finally {
      // Siempre ejecuta esto al final (éxito o error)      
      setIsLoading(false); //← Input se HABILITA de nuevo
    }
  }; //handleSubmit
  
  // ===========================================================================
  // INTERFAZ (lo que se muestra en pantalla)
  // ===========================================================================
  // El return devuelve lo que se va a mostrar en pantalla. 
  // Los estilos inline usan doble llave: {{ }} 
  // (una para JSX, otra para el objeto JavaScript).

  // Al envíar el formulario (Enter o clic en "Enviar"), ejecuta handleSubmit.

  // Input controlado por React:

  // value={formData.user} - El valor viene del estado
  // onChange={handleChange} - Cada cambio actualiza el estado
  // Esto hace que React sea la "fuente de verdad" de los datos

  // type="submit" - Activa el onSubmit del form
  // type="button" - No envía el form, solo ejecuta onClick
  
  //console.log("Estado actual:", { formData, isLoading, message });
  return (
    <div style={{ 
      padding: '40px', 
      color: 'white', 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh', 
      fontFamily: 'sans-serif'
      }}>
      <h1>Registro de Prueba (Microservicios)</h1>
      {/* FORMULARIO */}      
      <form 
        onSubmit={handleSubmit} 
        style={{
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px', 
          maxWidth: '300px'
        }}
      >
        <input 
          name="user"
          type="text" 
          placeholder="Usuario"
          value={formData.user} 
          onChange={handleChange}
          disabled={isLoading}          
          required
        />
        <input
          name="email" 
          type="email" 
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}   
          required
        />
        <input 
          name="password"
          type="password" 
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
          disabled={isLoading}   
          required
        />
        {/* BOTONES */}
        <div style={{ display: 'flex', gap: '10px' }}>      
          <button 
            type="submit"
            disabled={isLoading}          
            style={{ 
              flex: 1,
              padding: '10px', 
              backgroundColor: isLoading ? '#666' : '#4CAF50', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            { isLoading ? 'Enviando....' : 'Registrar'}
          </button>
          <button 
            type="button"
            onClick={handleBorrar}
            disabled={isLoading}          
            style={{ 
              flex: 1,
              padding: '10px', 
              backgroundColor: '#f44336', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Borrar
          </button>
        </div>       
      </form>
      {/* MENSAJES DE ESTADO */}
      {message && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px',
          backgroundColor: message.includes('Error') || message.includes('⚠️') 
            ? '#ff4444' 
            : message.includes('Enviando') 
              ? '#FFA500' 
              : '#00ff00',
          borderRadius: '8px',
          maxWidth: '300px'
        }}>
          {message}
        </div>        
      )}
      {/* CÓDIGO QR (solo si existe) */}
      {qrCode && (
        <div style={{ marginTop: '20px' }}>
          <h3>Escanea tu 2FA:</h3>
    {/* Reemplazamos <img> por el componente QRCodeSVG */}
        <div style={{ 
          background: 'white', 
          padding: '15px', 
          display: 'inline-block',
          borderRadius: '8px' 
        }}>
          <QRCodeSVG 
            value={qrCode} 
            size={256}
            level={"H"} // Alta recuperación de errores
          />
        </div>        
          <p style={{ 
            marginTop: '15px', 
            fontSize: '14px',
            maxWidth: '350px',
            lineHeight: '1.5'
          }}>
            💡 <strong>Importante:</strong> Guarda este código en tu aplicación de autenticación 
            (Google Authenticator, Authy, etc.) antes de cerrar esta página.
          </p>
        </div>
      )}
    </div>
  );
}  // del componente funcional App

// Exporta el componente para que main.tsx pueda importarlo.
export default App;
