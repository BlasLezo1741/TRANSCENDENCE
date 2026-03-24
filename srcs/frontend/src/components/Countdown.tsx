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
        <div className="absolute inset-1 flex justify-center items-center bg-black/30 backdrop-blur-sm z-50 rounded-xl">
            <div className="text-[150px] font-mono font-bold text-[#ea580c] text-shadow animate-pulse select-none">
                {showGo ? "GO!" : count}
            </div>
        </div>
    );
};
