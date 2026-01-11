import { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    user: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBorrar = () => {
    setFormData({ user: '', email: '', password: '' });
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Enviando datos a NestJS:", formData);
  const backendUrl = import.meta.env.VITE_API_URL;    
    // Aquí haremos el fetch a NestJS más adelante
    try {
      const response = await fetch('${backendUrl}/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      console.log("Respuesta del servidor:", data);
    } catch (error) {
      console.error("Error al conectar con el backend:", error);
    }
  };

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
}

export default App;