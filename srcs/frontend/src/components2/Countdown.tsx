import React, { useEffect, useState } from 'react';
import '../css/Countdown.css';

interface CountdownProps {
    onComplete: () => void; // Función que se ejecuta al terminar
}

export const Countdown = ({ onComplete }: CountdownProps) => {
    const [count, setCount] = useState(3);
    const [showGo, setShowGo] = useState(false);

    useEffect(() => {
        if (count > 0) {
            // Restar 1 cada segundo
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // Cuando llega a 0, activamos el estado "GO"
            setShowGo(true);
            
            // Mostramos "GO!" durante medio segundo y cerramos
            const timer = setTimeout(() => {
                onComplete(); 
            }, 600); 
            
            return () => clearTimeout(timer);
        }
    }, [count, onComplete]);

return (
        <div className="countdown-overlay">
            <div className="countdown-text">
                {showGo ? "GO!" : count}
            </div>
        </div>
    );
};