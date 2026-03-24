import React, { useState, useEffect, useMemo } from "react";
import { checkForm, registUser } from "../ts/utils/auth";
import type { ScreenProps } from "../ts/screenConf/screenProps";
import { useTranslation } from 'react-i18next';
import { useModal } from "../context/ModalContext";
import { QRCodeSVG } from 'qrcode.react';
import TermsModal from "../components/TermsModal";
import { sentence } from "../ts/utils/string";
import { useCountryNames } from "../ts/utils/countryName";

interface Country {
    name: string;
    code: string;
}

const SignScreen = ({ dispatch }: ScreenProps) => {
    const { t } = useTranslation();
    const { showModal } = useModal();

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
                //console.log(`reading countries from /countries (Ruta relativa)`);
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
            showModal({
                title: t('error'),
                message: t('errors.mustAcceptTerms'),
                type: 'error',
            });
            return;
        }

        // 2. Check local form validation
        const formResult = checkForm(user, email, password, repeat, birth, 
            { 
                requireUser: true, 
                requireEmail: true,
                requirePassword: true, 
                requireRepeat: true,
                requireBirth: true,
            });
        if (!formResult.ok) {
            setPassword("");
            setRepeat("");
            showModal({
                title: t('error'),
                message: t(formResult.msg),
                type: 'error',
            });
            // setError(t(formResult.msg));
            
            return;
        }
        if (!country){
            showModal({
                title: t('error'),
                message: t('errors.incorrectCountry'),
                type: 'error',
            });
            //setError(t('errors.incorrectCountry'));
                return ;
        }

        if (!language){
            showModal({
                title: t('error'),
                message: t('errors.incorrectLang'),
                type: 'error',
            });
            //setError(t('errors.incorrectLang'));
            return ;
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
                    //console.log(result.backupCodes);
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
            showModal({
                title: t('error'),
                message: t('errors.mustAcceptTerms'),
                type: 'error',
            });
            return;
        }
        // Persist the acceptance flag across the OAuth round-trip.
        // sessionStorage survives the provider redirect and is cleared
        // by App.tsx once consumed.
        sessionStorage.setItem('oauthTermsAccepted', 'true');
        window.location.href = `/auth/${provider}`;
    };

    return (
        <div className="flex flex-col items-center">
            <h1>{t('crear_cuenta')}</h1>

            <form className="form" onSubmit={handleForm} noValidate>
                {/* Error message */}
                {error && (
                    <span className="text-red-500">{error}</span>
                )}

                {/* User */}
                    <label className="label-black" htmlFor="user">{t('user')}</label>
                    <input
                        type="text"
                        id="user"
                        name="user"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="John_Wick123"
                        pattern="[a-zA-Z0-9_]{3,20}"
                        autoFocus
                        className="input-black"
                    />

                {/* Email */}
                    <label className="label-black" htmlFor="email">{t('prof.field_email')}</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        placeholder="abc@def.com"
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-black"
                    />

                {/* Password */}
                    <label className="label-black" htmlFor="pass">{sentence(t('password'))}</label>
                    <input
                        type="password"
                        id="pass"
                        name="pass"
                        value={password}
                        placeholder="P@ssw0rd!"
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-black"
                    />

                {/* Repeat Password */}
                    <label className="label-black" htmlFor="passR">{t('rep_pass')}</label>
                    <input
                        type="password"
                        id="passR"
                        name="passR"
                        value={repeat}
                        onChange={(e) => setRepeat(e.target.value)}
                        className="input-black"
                    />

                {/* Birth date */}
                    <label className="label-black" htmlFor="birth">{t('cumple')}</label>
                    <input
                        type="date"
                        name="birth"
                        id="birth"
                        value={birth}
                        onChange={(e) => setBirth(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="input-black"
                    />

                {/* Country & Language Row */}
                    {/* Country - UPDATED TO DROPDOWN */}
                    <label className="label-black" htmlFor="country">{t('cod_pais')}</label>
                    <select
                        className="select-black"
                        id="country"
                        name="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
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

                {/* Language */}
                    <label className="label-black" htmlFor="lang">{t('lang')}</label>
                    <select
                        className="select-black"
                        name="lang"
                        id="lang"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="">{t('sel_lang')}</option>
                        <option value="es">Español</option>
                        <option value="ca">Català</option>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                    </select>
                
                {/* QR Code check box */}
                <div className="flex-row">
                    <input
                        name="enabled2FA"
                        id="enabled2FA"
                        type="checkbox"
                        checked={enabled2FA}
                        onChange={(e) => setEnabled2FA(e.target.checked)}
                        className="input-black"
                    />
                    <label className="label-black" htmlFor="enabled2FA">{t('enable_2fa')}</label>
                </div>

                {/* Privacy policy + Terms of Use checkbox */}
                <div>
                    <input
                        name="acceptPolicy"
                        id="acceptPolicy"
                        type="checkbox"
                        checked={acceptPolicy}
                        onChange={(e) => setAcceptPolicy(e.target.checked)}
                        className="input-black"
                    />
                    <label className="label-black" htmlFor="acceptPolicy">
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
                <div className="flex flex-col gap-2">
                    <div className="py-5 flex flex-row justify-end gap-2 mb-5">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn bg-gray-200 text-gray-800 hover:bg-gray-300"
                        >
                            {t('borrar_t')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                            // className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                            // ${isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"} 
                            // focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                            >
                            {isLoading ? t('enviando') : t('enviar')}
                        </button>
                    </div>
                    
                    <hr />
                </div>
                

                {/* QR Code (only if present) */}
                {qrCode && (
                    <div className="mt-5">
                        <h3>{t('qr_setup1')}</h3>
                        <div className="bg-white p-4 inline-block rounded-lg">
                            <QRCodeSVG 
                                value={qrCode} 
                                size={256}
                                level={"H"} // Alta recuperación de errores
                            />
                        </div>        
                        <p className="mt-2 text-sm max-w-[350px] leading-relaxed">
                            💡 <strong>{t('qr_setup2')}</strong> {t('qr_setup3')}
                        </p>
                    </div>
                )}
                {backupCodes && backupCodes.length > 0 && (
                    <div>
                        <h3><strong>{t('backup_codes')}</strong></h3>
                        <strong className="text-red-500">{t('copy_codes')}</strong>
                        <ul>
                            {backupCodes.map((code, index) => (
                                <li key={index}>{code}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {success && (
                    <strong className="text-green-500">{success}</strong>
                )}

                {success && qrCode && (
                    <button
                        type="button"
                        className="btn bg-blue-500 text-white"
                        onClick={() => {
                            setSuccess(t('registro_exitoso'));
                            setTimeout(() => {
                                dispatch({ type: "MENU" });
                            }, 2000);
                        }}
                    >
                        ✅ {t('ya_escaneado')}
                    </button>
                )}

                {/* OAuth buttons */}
                {showOAuthButtons && (
                    <div className="flex flex-col">
                        <span className="text-black mb-1">{t('crear_cuenta')} / {t('init_ses')}: </span>

                        <div className="flex flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => handleOAuth('42')}
                                className="btn bg-black text-white hover:bg-gray-800">
                                42 Network
                            </button>

                            <button
                                type="button"
                                onClick={() => handleOAuth('google')}
                                className="btn bg-red-500 text-white hover:bg-red-600">
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