import React, { useState, useEffect } from 'react';
import { loadHtmlContent } from '../../ts/utils/loadHtmlContent';
import { useTranslation } from 'react-i18next';

import Li from '../objects/Li.tsx';

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
                    <Li
                        label={t('info.privacy_policy')}
                        active={activeTab === "a"}
                        onClick={() => setActiveTab("a")} />
                    <Li
                        label={t('info.terms_of_service')}
                        active={activeTab === "b"}
                        onClick={() => setActiveTab("b")} />
                    <Li
                        label={t('info.about_project')}
                        active={activeTab === "c"}
                        onClick={() => setActiveTab("c")}
                    />
                    <Li
                        label={t('info.contact')}
                        active={activeTab === "d"}
                        onClick={() => setActiveTab("d")}
                    />
                    <Li
                        label={t('info.credits')}
                        active={activeTab === "e"}
                        onClick={() => setActiveTab("e")}
                    />
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