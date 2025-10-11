import React, { useState, useRef } from 'react';

interface SubtitleInputProps {
  onFileSelect: (content: string, name: string) => void;
  isAnalyzing: boolean;
  analysisProgress: number;
  disabled: boolean;
  fileName: string;
}

export const SubtitleInput: React.FC<SubtitleInputProps> = ({ 
    onFileSelect, 
    isAnalyzing, 
    analysisProgress,
    disabled,
    fileName
}) => {
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        processFile(file);
    };

    const processFile = (file: File | undefined | null) => {
        if (file) {
            if (!file.name.toLowerCase().endsWith('.srt')) {
                setError('檔案格式不符，請上傳 .srt 格式的檔案。');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setError('');
                onFileSelect(text, file.name);
            };
            reader.onerror = () => {
                setError('讀取檔案時發生錯誤。');
            };
            reader.readAsText(file, 'UTF-8');
        }
    }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">
          2. 上傳字幕原文檔案
      </h2>
      <input
        type="file"
        id="srt-file-input"
        accept=".srt"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled || isAnalyzing}
        className="hidden"
      />
      <label 
        htmlFor="srt-file-input" 
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${disabled ? 'bg-gray-800 border-gray-700 cursor-not-allowed' : 'bg-gray-900 border-gray-700 hover:border-cyan-500 hover:bg-gray-800'}
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isAnalyzing ? (
                 <>
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full text-gray-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M19 4h-1.25a3 3 0 0 0-5.5 0H1a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1ZM3 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-bold text-lg">
                           {analysisProgress}%
                        </div>
                    </div>
                    <p className="mb-2 text-sm text-cyan-400 animate-pulse">分析專有名詞中...</p>
                 </>
            ) : fileName ? (
                <>
                    <i className="fa-solid fa-file-check text-green-500 fa-3x mb-3"></i>
                    <p className="mb-2 text-sm text-gray-200">
                        已選擇檔案： <span className="font-semibold">{fileName}</span>
                    </p>
                    <p className="text-xs text-gray-500">點擊可重新選擇</p>
                </>

            ) : (
                <>
                    <i className="fa-solid fa-cloud-upload text-gray-500 fa-3x mb-3"></i>
                    <p className="mb-2 text-sm text-gray-400">
                        <span className="font-semibold">點擊以上傳</span> 或拖放檔案至此
                    </p>
                    <p className="text-xs text-gray-500">僅限 SRT 字幕檔</p>
                </>
            )}
        </div>
      </label> 
      
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      
      {isAnalyzing && (
         <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
            <div 
                className="bg-cyan-600 h-2.5 rounded-full" 
                style={{width: `${analysisProgress}%`, transition: 'width 0.2s ease-in-out'}}
            ></div>
        </div>
      )}
    </div>
  );
};