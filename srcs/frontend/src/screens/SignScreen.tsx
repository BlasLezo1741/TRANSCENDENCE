import React, { useState, useEffect, useMemo } from "react";
import { checkForm, registUser } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import TermsModal from "../components/TermsModal";
import { sentence } from "../ts/utils/string";
import { useCountryNames } from "../ts/utils/countryName";

import '../css/Login.css';

interface Country {
    name: string;
    code: string;
}

const SignScreen = ({ dispatch }: ScreenProps) => {
    const { t } = useTranslation();

    // Localised country name resolver — updates automatically when language changes
    const countryName = useCountryNames();

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

    // Countries state
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    // Accept policy
    const [acceptPolicy, setAcceptPolicy] = useState(false);
    // Modal visibility for Terms and Privacy
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    // QR Code state
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [enabled2FA, setEnabled2FA] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
    // Show OAuth buttons flag
    const [showOAuthButtons, setShowOAuthButtons] = useState(true);

    // Fetch countries on component mount
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                console.log(`reading countries from /countries (Ruta relativa)`);
                const response = await fetch('/countries', {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
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

    const handleForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setQrCode(null);
        setBackupCodes(null);
        setShowOAuthButtons(true);

        // 1. Check terms acceptance
        if (!acceptPolicy) {
            setError(t('errors.mustAcceptTerms'));
            return;
        }

        // 2. Check local form validation
        const formResult = checkForm(user, email, password, repeat, birth);
        if (!formResult.ok) {
            setError(t(formResult.msg));
            setPassword("");
            setRepeat("");
            return;
        }

        setIsLoading(true);

        try {
            const result = await registUser(user, password, email, birth, country, language, enabled2FA);
            if (!result.ok) {
                setError(t(result.msg));
                setPassword("");
                setRepeat("");
            } else {
                setSuccess(t(result.msg));
                if (enabled2FA && result.qrCode) {
                    setQrCode(result.qrCode);
                    console.log(result.backupCodes);
                    setBackupCodes(result.backupCodes);
                    setShowOAuthButtons(false);
                }
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
        setShowOAuthButtons(true);
    };

    const handleOAuth = (provider: 'google' | '42') => {
        if (!acceptPolicy) {
            setError(t('errors.mustAcceptTerms'));
            return;
        }
        // Persist the acceptance flag across the OAuth round-trip.
        // sessionStorage survives the provider redirect and is cleared
        // by App.tsx once consumed.
        sessionStorage.setItem('oauthTermsAccepted', 'true');
        window.location.href = `/auth/${provider}`;
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
                    <label htmlFor="user">{t('user')}</label>
                    <input
                        type="text"
                        id="user"
                        name="user"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="John_Wick123"
                        pattern="[a-zA-Z0-9_]{3,20}"
                        required
                        autoFocus
                    />
                </div>

                {/* Email */}
                <div className="login-elem">
                    <label htmlFor="email">{t('prof.field_email')}</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        placeholder="abc@def.com"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {/* Password */}
                <div className="login-elem">
                    <label htmlFor="pass" className="block text-sm font-medium text-gray-700 mb-1">
                        {sentence(t('password'))}
                    </label>
                    <input
                        type="password"
                        id="pass"
                        name="pass"
                        value={password}
                        placeholder="P@ssw0rd!"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {/* Repeat Password */}
                <div className="login-elem">
                    <label htmlFor="passR">{t('rep_pass')}</label>
                    <input
                        type="password"
                        id="passR"
                        name="passR"
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value)}
                        required
                    />
                </div>

                {/* Birth date
                    type="date" always returns YYYY-MM-DD to JavaScript regardless of
                    how the browser displays it, so checkForm receives the correct format. */}
                <div className="login-elem">
                    <label htmlFor="birth">{t('cumple')}</label>
                    <input
                        type="date"
                        name="birth"
                        id="birth"
                        value={birth}
                        onChange={(e) => setBirth(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                    />
                </div>

                {/* Country — names localised to the active UI language via Intl.DisplayNames.
                    The ISO code (c.code) is submitted; the label shown is locale-aware.
                    Falls back to the English name from the DB if the code is unrecognised. */}
                <div className="login-elem">
                    <label htmlFor="country">{t('cod_pais')}</label>
                    <select
                        id="country"
                        name="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        disabled={isLoadingCountries}>
                        <option value="">
                            {isLoadingCountries ? t('prof.loading_countries') : t('sel_pais')}
                        </option>
                        {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                                {countryName(c.code, c.name)} ({c.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Language */}
                <div className="login-elem">
                    <label htmlFor="lang">{t('lang')}</label>
                    <select
                        name="lang"
                        id="lang"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        required
                    >
                        <option value="">{t('sel_lang')}</option>
                        <option value="es">Español</option>
                        <option value="ca">Català</option>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                    </select>
                </div>
                
                {/* QR Code check box */}
                <div className="login-btn">
                    <input
                        style={{ flexShrink: 0 }}
                        name="enabled2FA"
                        id="enabled2FA"
                        type="checkbox"
                        checked={enabled2FA}
                        onChange={(e) => setEnabled2FA(e.target.checked)}
                    />
                    <label htmlFor="enabled2FA">{t('enable_2fa')}</label>
                </div>

                {/* Privacy policy + Terms of Use checkbox */}
                <div className="login-btn">
                    <input
                        style={{ flexShrink: 0 }}
                        name="acceptPolicy"
                        id="acceptPolicy"
                        type="checkbox"
                        checked={acceptPolicy}
                        onChange={(e) => setAcceptPolicy(e.target.checked)}
                    />
                    <label htmlFor="acceptPolicy">
                        {t('privacy.prefix')}{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>
                            <u>{t('info.terms_of_service')}</u>
                        </a>
                        {" "}{t('privacy.and')}{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>
                            <u>{t('info.privacy_policy')}</u>
                        </a>
                        {t('privacy.dot')}
                    </label>
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
                    <button type="button" onClick={handleReset}>
                        {t('borrar_t')}
                    </button>
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? t('enviando') : t('enviar')}
                    </button>
                </div>

                <hr />

                {/* QR Code (only if present) */}
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
                                level={"H"}
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
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccess(t('registro_exitoso'));
                                    setTimeout(() => {
                                        dispatch({ type: "MENU" });
                                    }, 2000);
                                }}
                            >
                                ✅ {t('ya_escaneado')}
                            </button>
                        </div>
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
                {success && (
                    <div>
                        <p>{success}</p>
                    </div>
                )}

                {/* OAuth buttons */}
                {showOAuthButtons && (
                    <div className="login-elem">
                        <span style={{color: "black", marginBottom: "5px"}}>
                            {t('crear_cuenta')} / {t('init_ses')}:{" "}
                        </span>
                        <div className="login-btn">
                            <button type="button" onClick={() => handleOAuth('42')}>
                                <span>42 Network</span>
                            </button>
                            <button type="button" onClick={() => handleOAuth('google')}>
                                Google
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default SignScreen;