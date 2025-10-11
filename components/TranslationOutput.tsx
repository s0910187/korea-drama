import React, { useState, useEffect } from 'react';

interface TranslationOutputProps {
  translatedSubtitles: string;
  isLoading: boolean;
  isFinished: boolean;
  progressPercentage: number;
  currentTranslatingInfo: { id: string; timestamp: string } | null;
}

export const TranslationOutput: React.FC<TranslationOutputProps> = ({ 
  translatedSubtitles, 
  isLoading, 
  isFinished,
  progressPercentage,
  currentTranslatingInfo
}) => {
  const [copyButtonText, setCopyButtonText] = useState('複製內容');
  const [lineCount, setLineCount] = useState(0);

  useEffect(() => {
    if (translatedSubtitles) {
      setLineCount(translatedSubtitles.split('\n').filter(line => line.trim() !== '').length);
    } else {
      setLineCount(0);
    }
  }, [translatedSubtitles]);

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedSubtitles).then(() => {
      setCopyButtonText('已複製！');
      setTimeout(() => setCopyButtonText('複製內容'), 2000);
    }, (err) => {
      console.error('Could not copy text: ', err);
      setCopyButtonText('複製失敗');
      setTimeout(() => setCopyButtonText('複製內容'), 2000);
    });
  };

  const getStatusComponent = () => {
    if (isLoading) {
      let text = `翻譯中... ${progressPercentage}%`;
      if (progressPercentage < 100 && currentTranslatingInfo) {
        text += ` (處理中: #${currentTranslatingInfo.id} ${currentTranslatingInfo.timestamp})`;
      } else if (progressPercentage === 100) {
        text = '正在格式化結果...';
      }
      return <span className="text-sm text-cyan-400 font-mono animate-pulse pl-2 truncate">{text}</span>;
    }
    if (isFinished) {
      return <h2 className="text-xl font-bold text-cyan-400 pl-2">翻譯結果</h2>;
    }
    return <h2 className="text-xl font-bold text-cyan-400 pl-2">翻譯結果</h2>;
  };

  return (
    <div className="relative flex-grow flex flex-col bg-gray-800 p-1 rounded-lg shadow-lg h-full min-h-[500px]">
        <div className="absolute top-0 left-0 right-0 z-10 flex flex-col bg-gray-800 rounded-t-lg pt-1">
            <div className="flex items-center justify-between p-2 pr-3 min-w-0">
                <div className="flex-1 min-w-0">
                  {getStatusComponent()}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm text-gray-400">行數: {lineCount}</span>
                  <button
                      onClick={handleCopy}
                      disabled={!translatedSubtitles || isLoading}
                      className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200 text-xs font-bold py-2 px-3 rounded-md transition-all duration-300"
                  >
                      <i className={`fas ${copyButtonText === '已複製！' ? 'fa-check' : 'fa-copy'} mr-2`}></i>
                      {copyButtonText}
                  </button>
                </div>
            </div>
            {isLoading && (
                <div className="w-full bg-gray-700 h-1 mx-1 rounded-full mb-1">
                    <div 
                        className="bg-cyan-500 h-1 rounded-full" 
                        style={{ width: `${progressPercentage}%`, transition: 'width 0.2s ease-in-out' }}
                    ></div>
                </div>
            )}
        </div>
      <textarea
        readOnly
        value={translatedSubtitles}
        placeholder={isLoading ? "AI 正在努力翻譯中，請稍候..." : "翻譯結果將會顯示在這裡..."}
        className="w-full h-full flex-grow bg-gray-800 rounded-md p-4 pt-16 text-gray-200 font-mono text-sm leading-relaxed focus:ring-0 focus:outline-none border-none resize-none"
      />
    </div>
  );
};