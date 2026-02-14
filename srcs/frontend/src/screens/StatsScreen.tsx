const StatsScreen = () =>
{
// Definimos la URL con los parámetros necesarios:
    // kiosk=tv: oculta todos los menús de Grafana
    // orgId=1: asegura que entra a tu organización principal
    const grafanaUrl = "http://localhost:3000/d/transcendence_001?orgId=1&kiosk=tv";

    return (
        <section style={{ width: '100%', padding: '20px' }}>
            <h1 style={{ textAlign: 'center' }}>Estadísticas en Tiempo Real</h1>
            
            <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '600px', 
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <iframe
                    src={grafanaUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title="Grafana Dashboard"
                ></iframe>
            </div>
        </section>
    );
};

export default StatsScreen;