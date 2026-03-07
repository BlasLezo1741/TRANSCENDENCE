import React, { useState, useEffect } from "react";
import { checkForm,  registUser } from "../../ts/utils/auth";//checkPassword,
import type { ScreenProps } from "../../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react'; // Importamos el generador de QR
import TermsModal from "../section/TermsModal";
import Input from '../objects/Input.tsx';
import Label from '../objects/Label.tsx';
import Btn from '../objects/Btn.tsx';
import Select from '../objects/Select.tsx';

interface Country {
    name: string;
    code: string;
}

const SignScreen = ({ dispatch }: ScreenProps) => {
    // USE TRANSLATOR
    const { t } = useTranslation();

    const [user, setUser] = useState("");
    const [password, setPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [email, setEmail] = useState("");
    const [birth, setBirth] = useState("");
    
    // SEPARATE STATES
    const [country, setCountry] = useState(""); 
    const [language, setLanguage] = useState("");
    
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // NEW: Countries state
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    // NEW: Accept policy
    const [acceptPolicy, setAcceptPolicy] = useState(false);
    // NEW: Modal visibility for Terms and Privacy
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    // NEW: QR Code state
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [enabled2FA, setEnabled2FA] = useState(false);  //Por defecto no se activa
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);  // Puede ser null inicialmente
    // SHOW OAUTH BUTTONS FLAG
    const [showOAuthButtons, setShowOAuthButtons] = useState(true)  ; // Cambia esto según tus necesidades
    // ===========================================================================

    // NEW: Fetch countries on component mount
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                
                // const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
                // console.log(`reading  countries from ${API_URL}/countries`);
                // const response = await fetch(`${API_URL}/countries`, 
                // CAMBIO CLAVE: Usamos directamente la ruta relativa '/countries'
                // El navegador le añadirá automáticamente 'https://tu-ip:8443' delante.
                console.log(`reading countries from /countries (Ruta relativa)`);
                
                const response = await fetch('/countries',
                    {
                        method: 'GET',
                        mode: 'cors', // Asegura que CORS esté habilitado en el backend
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        // IMPORTANTE: Si usas cookies o sesiones, añade esto:
                        // credentials: 'include' 
                    });
                
                if (response.ok) {
                    const data = await response.json();
                    setCountries(data);
                } else {
                    console.error('Failed to fetch countries');
                }
            } catch (error) {
                console.error('Error fetching countries:¿is it 3000 public', error);
            } finally {
                setIsLoadingCountries(false);
            }
        };

        fetchCountries();
    }, []);
    // ===========================================================================
    // FUNCIONES (handlers)
    // ===========================================================================
    
    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setQrCode(null);
        setBackupCodes(null);
        setShowOAuthButtons(true); // Show OAuth buttons on form submission

        // 1. Check terms acceptance
        if (!acceptPolicy) {
            setError(t('errors.mustAcceptTerms'));
            return;
        }

        // 2. Check local password syntax
        const formResult = checkForm(email, password, repeat, birth);
        if (!formResult.ok) {
            setError(t(formResult.msg));
            setPassword("");
            setRepeat("");
            return;
        }
        setIsLoading(true);

        try {
            // 2. Check backend registration
            // We now pass BOTH country and language separately
            const result = await registUser(user, password, email, birth, country, language, enabled2FA);
            
            if (!result.ok) {
                setError(t(result.msg));
                setPassword("");
                setRepeat("");
            } else {
                setSuccess(t(result.msg));            
                // If 2FA is enabled, set the QR code
                if (enabled2FA && result.qrCode) {
                    setQrCode(result.qrCode);
                    setBackupCodes(result.backupCodes);
                    setShowOAuthButtons(false); // Show OAuth buttons on form submission
                }
                //setTimeout(() => dispatch({ type: "MENU" }), 2000); // 2 Seg. de por favor
            }
        } catch (err) {
            setError(t('errors.connectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setUser("");
        setPassword("");
        setRepeat("");
        setEmail("");
        setBirth("");
        setCountry("");
        setLanguage("");
        setError("");
        setQrCode(null);
        setAcceptPolicy(false);
        setEnabled2FA(false);
        setBackupCodes(null);
        setShowOAuthButtons(true); // Show OAuth buttons on form submission
    };
    const handleOAuth = (provider: 'google' | '42') => {
        if (!acceptPolicy) {
            setError(t('errors.mustAcceptTerms'));
            return;
        }
        console.log(`Redirigiendo a OAuth con ${provider}`);
        //window.location.href = `http://localhost:3000/auth/${provider}`;
        window.location.href = `/auth/${provider}`; //para nginx
    };

    return (
        <div>
            <div>
                <h1>{t('crear_cuenta')}</h1>
            </div>

            <form onSubmit={handleForm} className="login-form" noValidate>
                {/* Error message */}
                {error && (
                    <span style={{color: "red"}}>{error}</span>
                )}

                {/* User */}
                <div className="login-elem">
                    <Label htmlFor="user" children={t('user')}/>
                    <Input id="user" value={user} onChange={(value) => setUser(value)}
                        placeholder="ej: Jhon_Wick123" required autoFocus 
                        pattern="[a-zA-Z0-9_]{3,20}"
                    />
                </div>

                {/* Email */}
                <div className="login-elem">
                    <Label htmlFor="email" children="email"/>
                    <Input type="email" id="email" value={email} placeholder="ej: abc@def.com"
                        onChange={(value) => setEmail(value)} required/>
                </div>

                {/* Password Info Box */}
                {/* <div>
                    {t('pass_req')}
                </div> */}

                {/* Password */}
                <div className="login-elem">
                    <Label htmlFor="pass" children={t('password').charAt(0).toUpperCase() + t('password').slice(1)}/>
                    <Input type="password" id="pass" value={password} required
                        placeholder="ej: P@ssw0rd!" onChange={(value) => setPassword(value)} />
                </div>

                {/* Repeat Password */}
                <div className="login-elem">
                    <Label htmlFor="passR" children={t('rep_pass')} />
                    <Input type="password" id="passR" value={repeat} required
                        onChange={(value) => setRepeat(value)} />
                </div>

                {/* Birth date */}
                <div className="login-elem">
                    <Label htmlFor="birth" children={t('cumple')} />
                    <Input type="date" id="birth" value={birth} required 
                        onChange={(value) => setBirth(value)} />
                </div>

                {/* Country & Language Row */}
                <div className="login-elem">
                    {/* Country - UPDATED TO DROPDOWN */}
                    <Label htmlFor="country" children={t('cod_pais')} />
                    <Select
                        id="country"
                        value={country} 
                        onChange={setCountry} 
                        required 
                        disabled={isLoadingCountries} 
                        options={[
                            {
                                value: "",
                                label: isLoadingCountries ? "Loading..." : t("sel_pais")
                            },
                            ...countries.map((c) => ({
                                value: c.code, 
                                label: `${c.name} (${c.code})`
                            }))
                        ]}
                    />
                </div>

                {/* Language */}
                <div className="login-elem">
                    <Label htmlFor="lang" children={t('lang')} />
                    <Select
                        id="lang"
                        value={language} 
                        onChange={setLanguage}
                        required 
                        options={[
                            { value: "", label: t("sel_lang") },
                            { value: "es", label: "Español" },
                            { value: "ca", label: "Català" },
                            { value: "en", label: "English" },
                            { value: "fr", label: "Français" },
                        ]}
                    />
                </div>
                
                {/* QR Code check box */}
                <div className="login-btn">
                    <Input id="enabled2FA" type="checkbox" checked={enabled2FA} 
                        onChange={(value) => setEnabled2FA(value)} />
                    <Label htmlFor="enable2FA" children={t('enable_2fa')} />
                </div>
                {/* Privacy policy + Terms of Use checkbox */}
                <div className="login-btn">
                    <Input id="acceptPolicy" type="checkbox" checked={acceptPolicy} 
                        onChange={(value) => setAcceptPolicy(value)} />
                    <Label htmlFor="acceptPolicy">
                        {t('privacy.prefix')}{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>
                            {t('info.terms_of_service')}
                        </a>
                        {" "}{t('privacy.and')}{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>
                            {t('info.privacy_policy')}
                        </a>
                        {t('privacy.suffix')}
                    </Label>
                </div>

                {/* Modals */}
                <TermsModal
                    isOpen={showTermsModal}
                    onClose={() => setShowTermsModal(false)}
                    title={t('info.terms_of_service')}
                    fileName="terms"
                />
                <TermsModal
                    isOpen={showPrivacyModal}
                    onClose={() => setShowPrivacyModal(false)}
                    title={t('info.privacy_policy')}
                    fileName="privacy"
                />
                {/* Action Buttons */}
                <div className="login-btn form-btn">
                    <Btn msg={t('borrar_t')} onClick={handleReset}/>
                    <Btn msg={isLoading ? t('enviando') : t('enviar')} disabled/>
                </div>

                <hr />

                {/* CÓDIGO QR (solo si existe) */}
                {qrCode && (
                    <div style={{ marginTop: '20px' }}>
                        <h3>{t('qr_setup1')}</h3>
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
                            💡 <strong>{t('qr_setup2')}</strong> {t('qr_setup3')}
                        </p>
                        
                        {/* --- NUEVO BOTÓN DE CONFIRMACIÓN --- */}
                        <Btn msg="✅ {t('ya_escaneado')}"
                            onClick={() =>
                            {
                                setSuccess(t('registro_exitoso'));
                                setTimeout(() =>
                                {
                                    dispatch({ type: "MENU" });
                                }, 2000);
                            }}
                        />  
                    </div>
                )}
                {backupCodes && backupCodes.length > 0 && (
                <div>
                    <h3>{t('backup_codes')}</h3>
                    <p>{t('copy_codes')}</p>
                    <ul>
                    {backupCodes.map((code, index) => (
                        <li key={index}>{code}</li>
                    ))}
                    </ul>
                </div>
                )}
                {/* Mensajes de Feedback */}
                {/* {error && (
                    <span style={{color: "red"}}>{t('error')}: {error}</span>
                )} */}
                {success && (
                    <div>
                        <p>{success}</p>
                    </div>
                )}
                {/* --- OAUTH BUTTONS --- */}
                {showOAuthButtons && (
                <div className="login-elem">
                    <span style={{color: "black", marginBottom: "5px"}}>{t('crear_cuenta')} / {t('init_ses')}: </span>

                    <div className="login-btn">
                        <Btn msg="42 Network" onClick={() => handleOAuth('42')}/>
                        <Btn msg="Google" onClick={() => handleOAuth('google')}/>
                    </div>
                </div>
                )}
            </form>
        </div>
    );
};

export default SignScreen;