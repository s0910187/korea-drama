import React from 'react';

interface SettingsPanelProps {
  step: 'intro' | 'review';
  programIntro: string;
  setProgramIntro: (value: string) => void;
  customTerms: string;
  setCustomTerms: (value: string) => void;
  disabled: boolean;
}

const InfoIcon = () => (
    <i className="fa-solid fa-circle-info text-cyan-400 ml-2"></i>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  step,
  programIntro,
  setProgramIntro,
  customTerms,
  setCustomTerms,
  disabled
}) => {
  return (
    <div className="flex flex-col gap-6">
       {step === 'intro' && (
        <>
            <h2 className="text-xl font-bold text-cyan-400 border-b-2 border-cyan-700 pb-2">1. 提供節目簡介</h2>
            <div>
                <label htmlFor="programIntro" className="flex items-center text-lg font-bold text-gray-200 mb-2">
                節目簡介 (必填) <InfoIcon />
                </label>
                <p className="text-sm text-gray-400 mb-2">請貼上節目相關的簡介，包含主要人物、地名等，這將作為 AI 分析上下文的關鍵依據。</p>
                <textarea
                id="programIntro"
                rows={8}
                value={programIntro}
                onChange={(e) => setProgramIntro(e.target.value)}
                placeholder="例如：《吃貨大廚的秘密廚房》（韓語：셰프의 이모집，英語：​Studio Ah Yeah）為Disney+於2025年8月26日起上線的原創韓國綜藝節目，由《黑白大廚：料理階級大戰》的三位廚師「烹飪狂人」尹男老、「外送員廚師」 林泰勳、「肉類黑幫」李大衛、以及尹斗俊、日式大廚金民成主持，帶領觀眾離開美食主幹道，深入巷弄小店，探索只有內行人才知道的美食祕境。"
                disabled={disabled}
                className="w-full bg-gray-900 border-2 border-gray-700 focus:border-cyan-500 focus:ring-cyan-500 rounded-md py-2 px-4 text-gray-200 transition disabled:opacity-50"
                />
            </div>
        </>
       )}
       {step === 'review' && (
        <>
            <h2 className="text-xl font-bold text-cyan-400 border-b-2 border-cyan-700 pb-2">3. 檢閱與設定</h2>
            <div>
                <label htmlFor="customTerms" className="flex items-center text-lg font-bold text-gray-200 mb-2">
                檢閱/編輯術語 (AI 建議) <InfoIcon />
                </label>
                <p className="text-sm text-gray-400 mb-2">AI 已自動分析並建議以下術語翻譯，您可自行修改或新增。格式為「原文:譯文」，每組用逗號「,」分隔。</p>
                <textarea
                id="customTerms"
                value={customTerms}
                onChange={(e) => setCustomTerms(e.target.value)}
                placeholder="例如：소맥:燒啤, 김치:泡菜, 강남:江南"
                rows={4}
                disabled={disabled}
                className="w-full bg-gray-900 border-2 border-gray-700 focus:border-cyan-500 focus:ring-cyan-500 rounded-md py-2 px-4 text-gray-200 transition disabled:opacity-50"
                />
            </div>
        </>
       )}
    </div>
  );
};