// frontend/src/components/TermsModal.tsx

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadHtmlContent } from "../ts/utils/loadHtmlContent";

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
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
        >
            {/* Modal box — stopPropagation prevents backdrop-click from firing inside */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white text-black rounded-lg w-[min(90vw,680px)] max-h-[80vh] flex flex-col shadow-lg"
            >
                {/* Header */}
                <div
                    className="p-4 px-5 border-b border-gray-300 flex justify-between items-center"
                >
                    <h2 className="m-0 text-base">{title}</h2>
                    <button
                        onClick={onClose}
                        class="btn bg-transparent border-0 text-xl leading-none text-gray-600"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable body */}
                <div
                    className="p-4 px-5 overflow-y-auto flex-1 text-sm leading-6"
                >
                    {isLoading
                        ? <p>{t("modal.loading")}</p>
                        : <div dangerouslySetInnerHTML={{ __html: content }} />
                    }
                </div>

                {/* Footer */}
                <div
                    className="p-3 px-5 border-t border-gray-300 flex justify-end"
                >
                    <button className="btn" onClick={onClose}>
                        {t("modal.cancel_btn")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;