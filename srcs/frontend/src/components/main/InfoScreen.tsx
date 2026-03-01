import React, { useState, useEffect } from 'react';
import { loadHtmlContent } from '../../ts/utils/loadHtmlContent';
import { useTranslation } from 'react-i18next';
import "../../css/ProfileScreen.css";

type States = 'a' | 'b' | 'c' | 'd' | 'e';

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

const InfoScreen = ({dispatch, option}: InfoProps) => {
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

    return (
        <main className="profile">
            {/* Navigation */}
            <nav>
                <ul>
                    <li
                        onClick={() => setActiveTab("a")}
                        className={activeTab === "a" ? "selected" : ""}>
                        {t('info.privacy_policy')}
                    </li>
                    <li
                        onClick={() => setActiveTab("b")}
                        className={activeTab === "b" ? "selected" : ""}>
                        {t('info.terms_of_service')}
                    </li>
                    <li
                        onClick={() => setActiveTab("c")}
                        className={activeTab === "c" ? "selected" : ""}>
                        {t('info.about_project')}
                    </li>
                    <li
                        onClick={() => setActiveTab("d")}
                        className={activeTab === "d" ? "selected" : ""}>
                        {t('info.contact')}
                    </li>
                    <li
                        onClick={() => setActiveTab("e")}
                        className={activeTab === "e" ? "selected" : ""}>
                        {t('info.credits')}
                    </li>
                </ul>
            </nav>

            {/* Content */}
            <section>
                <div className="p-cont">
                    {loading ? (
                        <p>{t('info.loading')}</p>
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                    )}
                </div>
            </section>
        </main>
    );
};

export default InfoScreen;