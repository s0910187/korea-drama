import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
        韓劇韓綜字幕翻譯機
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        專為台灣語境打造的 AI 智能翻譯工具
      </p>
    </header>
  );
};
