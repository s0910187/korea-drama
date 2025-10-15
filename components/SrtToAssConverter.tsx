import React, { useState, useRef } from 'react';
import { convertSrtToAss, downloadFile } from './srtUtils';

export const SrtToAssConverter: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [srtContent, setSrtContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.srt')) {
                setError('請上傳 .srt 格式的檔案。');
                setSrtContent(null);
                setFileName('');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setSrtContent(text);
                setFileName(file.name);
                setError('');
            };
            reader.onerror = () => {
                setError('讀取檔案時發生錯誤。');
                setSrtContent(null);
                setFileName('');
            };
            reader.readAsText(file, 'UTF-8');
        }
    };

    const handleConvertAndDownload = () => {
        if (!srtContent) {
            setError('沒有可轉換的檔案內容。');
            return;
        }
        try {
            const assContent = convertSrtToAss(srtContent);
            const newFileName = fileName.replace(/\.srt$/i, '.ass');
            downloadFile(assContent, newFileName, 'text/plain;charset=utf-8');
        } catch (e) {
            console.error(e);
            setError('轉換時發生錯誤，請檢查 SRT 檔案格式是否正確。');
        }
    };

    const handleClear = () => {
        setSrtContent(null);
        setFileName('');
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="my-6 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 bg-gray-700 hover:bg-gray-600 flex justify-between items-center transition"
                aria-expanded={isExpanded}
                aria-controls="srt-converter-panel"
            >
                <h2 className="text-lg font-bold text-cyan-400">
                    <i className="fa-solid fa-file-export mr-3"></i>
                    獨立工具：SRT 轉檔為 ASS
                </h2>
                <i className={`fa-solid fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </button>
            {isExpanded && (
                <div id="srt-converter-panel" className="p-6 animate-fade-in">
                    <p className="text-sm text-gray-400 mb-4">
                        若您已有翻譯好的 SRT 字幕檔，可使用此工具直接轉換為 ASS 格式，並為括號註解套用特殊樣式。
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="file"
                            accept=".srt"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                            id="srt-upload"
                        />
                        <label htmlFor="srt-upload" className="flex-grow cursor-pointer bg-gray-900 border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-lg p-4 text-center text-gray-400 transition">
                            {fileName ? (
                                <>
                                    <i className="fa-solid fa-file-check text-green-500 mr-2"></i>
                                    {fileName}
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-upload mr-2"></i>
                                    點擊此處選擇 .srt 檔案
                                </>
                            )}
                        </label>
                        {srtContent && (
                             <button
                                onClick={handleClear}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition"
                                title="清除選擇"
                            >
                                <i className="fa-solid fa-times"></i>
                            </button>
                        )}
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleConvertAndDownload}
                            disabled={!srtContent}
                            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 text-lg"
                        >
                            <i className="fa-solid fa-download mr-2"></i>
                            轉換並下載 ASS 字幕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};