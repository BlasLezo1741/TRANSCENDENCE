import React, { useState, useEffect } from 'react';
import { loadHtmlContent } from '../ts/utils/loadHtmlContent';
import { useTranslation } from 'react-i18next';

export type States = 'a' | 'b' | 'c' | 'd' | 'e';

type InfoProps = {
    dispatch: React.Dispatch<any>;
    option: States;
};

const contentMap: Record<States, string> = {
    a: 'privacy',
    b: 'terms',
    c: 'about',
    d: 'contact',
    e: 'credits'
};
// dispatch option is unused. Kept for potential use
const InfoScreen = ({dispatch: _dispatch, option}: InfoProps) => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<States>(option);
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    
    useEffect(() => {
        setActiveTab(option);
    }, [option]);

    // Load HTML content when tab or language changes
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            const fileName = contentMap[activeTab];
            const content = await loadHtmlContent(fileName, i18n.language);
            setHtmlContent(content);
            setLoading(false);
        };

        loadContent();
    }, [activeTab, i18n.language]);

    const selectedCss = "bg-blue-500 border-b-4 border-azure pointer-events-none";

    return (
        <main className="w-full h-[79vh] grid grid-cols-[150px_1fr] lg:grid-cols-[150px_1fr_320px]">
            {/* Navigation */}
            <nav className="h-[79vh] bg-[hsl(139,68%,37%)]">
                <ul className="pt-4">
                    <li
                        onClick={() => setActiveTab("a")}
                        className={`li ${activeTab === "a" ? selectedCss : ""}`}
                    >
                        {t('info.privacy_policy')}
                    </li>
                    <li
                        onClick={() => setActiveTab("b")}
                        className={`li ${activeTab === "b" ? selectedCss : ""}`}>
                        {t('info.terms_of_service')}
                    </li>
                    <li
                        onClick={() => setActiveTab("c")}
                        className={`li ${activeTab === "c" ? selectedCss : ""}`}>
                        {t('info.about_project')}
                    </li>
                    <li
                        onClick={() => setActiveTab("d")}
                        className={`li ${activeTab === "d" ? selectedCss : ""}`}>
                        {t('info.contact')}
                    </li>
                    <li
                        onClick={() => setActiveTab("e")}
                        className={`li ${activeTab === "e" ? selectedCss : ""}`}>
                        {t('info.credits')}
                    </li>
                </ul>
            </nav>

            {/* Content */}
            <section>
                <div className="w-full mx-auto text-[#a1bdf3]">
                    {loading ? (
                        <p>{t('info.loading')}</p>
                    ) : (
                        <div className="h-[79vh] w-full overflow-y-auto" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    )}
                </div>
            </section>
            <div className="bg-[#2d2979]"></div>

        </main>
    );
};

export default InfoScreen;