// frontend/src/components/TermsModal.tsx

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadHtmlContent } from "../../ts/utils/loadHtmlContent";
import Btn from '../objects/Btn.tsx';
interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fileName: "privacy" | "terms"; // matches filenames in src/local/<lang>/
}

const TermsModal = ({ isOpen, onClose, title, fileName }: TermsModalProps) => {
    const { t, i18n } = useTranslation();
    const [content, setContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // Reload whenever the modal opens or the UI language changes
    useEffect(() => {
        if (!isOpen) return;

        const load = async () => {
            setIsLoading(true);
            const html = await loadHtmlContent(fileName, i18n.language);
            setContent(html);
            setIsLoading(false);
        };

        load();
    }, [isOpen, fileName, i18n.language]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        // Backdrop
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            {/* Modal box — stopPropagation prevents backdrop-click from firing inside */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#fff",
                    color: "#000",
                    borderRadius: "8px",
                    width: "min(90vw, 680px)",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #ddd",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>
                    <Btn
                        onClick={onClose}
                        aria-label="Close"
                        msg="x"
                        /* style={{
                            background: "none",
                            border: "none",
                            fontSize: "1.4rem",
                            cursor: "pointer",
                            lineHeight: 1,
                            color: "#555",
                        }} */
                    />
                </div>

                {/* Scrollable body */}
                <div
                    style={{
                        padding: "16px 20px",
                        overflowY: "auto",
                        flex: 1,
                        fontSize: "0.88rem",
                        lineHeight: 1.6,
                    }}
                >
                    {isLoading
                        ? <p>{t("modal.loading")}</p>
                        : <div dangerouslySetInnerHTML={{ __html: content }} />
                    }
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "12px 20px",
                        borderTop: "1px solid #ddd",
                        display: "flex",
                        justifyContent: "flex-end",
                    }}
                >
                    <Btn
                        onClick={onClose}
                        msg={t("modal.cancel_btn")}
                    />
                </div>
            </div>
        </div>
    );
};

export default TermsModal;