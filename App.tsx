import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { SubtitleInput } from './components/SubtitleInput';
import { TranslationOutput } from './components/TranslationOutput';
import { ProgressTracker } from './components/ProgressTracker';
import { SrtToAssConverter } from './components/SrtToAssConverter';
import { convertSrtToAss, downloadFile } from './components/srtUtils';

export type AppStep = 'intro' | 'upload' | 'analyzing' | 'review' | 'translating' | 'finished';
type TranslatingInfo = { id: string; timestamp: string } | null;

interface SubtitleLine {
  uniqueId: string;
  originalText: string;
}

interface OriginalSubtitleBlock {
    id: string;
    timestamp: string;
    textLines: string[];
}

const parseTerms = (termsStr: string): Map<string, string> => {
    const map = new Map<string, string>();
    if (!termsStr.trim()) return map;
    termsStr.split(',').forEach(pair => {
        const parts = pair.split(':');
        if (parts.length === 2) {
            const original = parts[0].trim();
            const translated = parts[1].trim();
            if (original) {
                map.set(original, translated);
            }
        }
    });
    return map;
};

const serializeTerms = (termsMap: Map<string, string>): string => {
    const pairs: string[] = [];
    termsMap.forEach((translated, original) => {
        pairs.push(`${original}:${translated}`);
    });
    return pairs.join(', ');
};

const mergeTerms = (baseStr: string, additionsStr: string): string => {
    const baseMap = parseTerms(baseStr);
    const additionsMap = parseTerms(additionsStr);
    const mergedMap = new Map([...baseMap, ...additionsMap]);
    return serializeTerms(mergedMap);
};


const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('intro');
  const [originalSubtitles, setOriginalSubtitles] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [translatedSubtitles, setTranslatedSubtitles] = useState<string>('');
  const [programIntro, setProgramIntro] = useState<string>('');
  const [establishedTerms, setEstablishedTerms] = useState<string>('');
  const [editableTerms, setEditableTerms] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [translationProgressPercentage, setTranslationProgressPercentage] = useState<number>(0);
  const [currentTranslatingInfo, setCurrentTranslatingInfo] = useState<TranslatingInfo>(null);

  const handleAnalyze = async (subtitles: string) => {
    if (!subtitles.trim()) {
      setError('上傳的字幕檔案內容為空。');
      setStep('upload');
      return;
    }
    setStep('analyzing');
    setError('');
    setAnalysisProgress(0);

    let progressInterval: ReturnType<typeof setInterval> | null = null;
    
    try {
        const startTime = Date.now();
        progressInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const timeConstantSeconds = Math.max(20, subtitles.length / 5000); // Adjust simulation time based on content length
            const progress = Math.min(99, 100 * (1 - 1 / (elapsedTime / 1000 / timeConstantSeconds + 1)));
            setAnalysisProgress(Math.floor(progress));
        }, 100);

        const analysisPrompt = `
          You are an expert linguist specializing in Korean and Taiwanese Traditional Chinese. Your task is to extract specific, high-value "Terms" from a subtitle text and provide their Taiwanese translation, while maintaining consistency with previously established terms.

          **I. Definition of a "Term" (鋼鐵定義):**
          A "Term" is strictly defined as a **proper noun** or a **culturally specific noun/short phrase**. This includes:
          - People's names (e.g., "지훈", "김 반장")
          - Place names (e.g., "마리아병원", "Seoul")
          - Organization names (e.g., "MBC")
          - Brand names
          - Titles of works (movies, shows, books, e.g., "MARY KILLS PEOPLE")
          - Unique cultural concepts or items (e.g., "소맥", "horaegi")
          - Technical or medical jargon (e.g., "MRI", "pentobarbital")

          **II. Absolute Prohibition (絕對禁止):**
          You are **STRICTLY FORBIDDEN** from extracting or translating:
          - **Full sentences or clauses** (e.g., "하고 싶은 거 있으면 말해")
          - **Common conversational phrases** (e.g., "걱정 마요", "괜찮으세요?")
          - **Verb phrases or general descriptions**
          Your primary goal is to identify **NOUNS** that have a specific, unique identity. An extracted "Term" should **NEVER** be a complete sentence.

          **III. Execution Protocol:**
          1.  Read the "Program Intro" to understand the context of characters and setting.
          2.  Review the "Previously Established Terms" as the source of truth for consistency.
          3.  Scan the new "Subtitle Text" line by line.
          4.  Identify only **NEW** terms that are not present in the established list.
          5.  For each valid new term, provide its most appropriate Taiwanese Traditional Chinese translation, ensuring it is consistent with the established terms.
          6.  **Critical Rule:** If a Term is already in correct Taiwanese Chinese, or if its "translation" would be identical to the original, you MUST OMIT it. Only provide terms that require actual translation or localization.
          7.  Format your final output as a comma-separated list: "原文:譯文".

          **IV. Previously Established Terms (for Consistency):**
          The following terms have already been translated for this episode. You MUST ensure your new suggestions are consistent with these. Do not suggest a term if it is already on this list.
          ---
          ${establishedTerms || 'None'}
          ---

          **V. Top Priority Directive: Name Handling (絕對覆寫鐵律)**
          This rule is the highest priority of all. You must follow it unconditionally, overriding any of your own linguistic judgments.

          1.  **Context:** The Program Intro may provide a name mapping like "Kim Minseong (Minseong)". You must learn this.
          2.  **Action:** When scanning the text, you must differentiate between the full name and the first name.
          3.  **Rule for Full Names:** If you encounter a full name (e.g., "Kim Minseong"), you must extract it and translate it as a full name (e.g., "Kim Minseong:金民成").
          4.  **Rule for First Names:** If you encounter just the first name (e.g., "Minseong"), you must extract it and translate it as just the first name (e.g., "Minseong:民成").
          5.  **Non-Negotiable:** You are **absolutely forbidden** from translating a first name into a full name.
          6.  **Both Forms:** If both the full name and the first name appear in the text, you **must** extract them as two separate, independent terms in your output.
          7.  **Example Scenario:**
              - Text contains: "Kim Minseong is here." and later "Minseong is hungry."
              - Your output **must** include both: \`Kim Minseong:金民成, Minseong:民成\` (order may vary).
              - An **incorrect** output would be: \`Minseong:金民成\` (This is a critical failure).

          Now, execute this task based on the following data.

          Program Intro:
          ---
          ${programIntro}
          ---
          Subtitle Text:
          ---
          ${subtitles}
          ---
        `;
      if (!process.env.API_KEY) {
        throw new Error("API 金鑰未設定。請檢查您的 .env.local 檔案或 Vercel 環境變數。");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: analysisPrompt,
      });
      
      if (progressInterval) clearInterval(progressInterval);
      setAnalysisProgress(100);

      setTimeout(() => {
        const analysisResult = response.text.trim();
        const merged = mergeTerms(editableTerms, analysisResult);
        setEditableTerms(merged);
        setStep('review');
      }, 300);

    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setAnalysisProgress(0);
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : '發生未知錯誤';
      setError(`術語分析失敗：${errorMessage}`);
      setStep('upload');
    }
  };

  const handleTranslate = async () => {
    setStep('translating');
    setError('');
    setTranslatedSubtitles('');
    setTranslationProgressPercentage(0);
    setCurrentTranslatingInfo(null);
    setEstablishedTerms(editableTerms);
    
    const originalBlocks: OriginalSubtitleBlock[] = originalSubtitles.trim().split(/\n\s*\n/).map(block => {
        const lines = block.split('\n');
        const id = lines.shift() || '';
        const timestamp = lines.shift() || '';
        return { id, timestamp, textLines: lines };
    });
    
    const linesToTranslate: SubtitleLine[] = [];
    originalBlocks.forEach(block => {
        block.textLines.forEach((line, index) => {
            linesToTranslate.push({
                uniqueId: `${block.id}-${index}`,
                originalText: line,
            });
        });
    });

    try {
      if (!process.env.API_KEY) {
        throw new Error("API 金鑰未設定。請檢查您的 .env.local 檔案或 Vercel 環境變數。");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
I. 核心身份與目標
你是一位頂級筆譯專家，精通台灣繁體中文，曾深度參與多部韓國電視劇與綜藝節目的字幕翻譯工作。你的唯一目標是，將使用者提供的 **單行字幕列表**，逐行精準地翻譯成台灣觀眾覺得最自然、最道地的繁體中文字幕。

II. 核心翻譯原則
1.  **語意保真，破除直譯**：深刻理解原文的語境、語氣與文化，選擇最貼切的台灣中文表達。
2.  **在地化精準度**：嚴格使用台灣地區的詞彙、句法與慣例。
3.  **語氣與文化細膩度**：精準捕捉原文的情感與正式程度，選擇適當的詞語。
4.  **通俗易懂與現代化**：使用 12 歲青少年也能輕易理解的詞彙與句型。例如，若翻譯標題 "The Tale of the Turtle"，應譯為《龍宮奇緣》或《龍宮傳奇》，絕不可譯為《鱉主簿傳》。
5.  **技術格式規範**：
    *   使用全形標點符號，但句末一律不使用句點「。」。
    *   在中文與英文或數字之間，必須插入一個半形空格。
    *   在翻譯對話時，若原文以破折號(-)開頭，譯文也必須以破折號(-)開頭。
    *   **絕對規則**：所有逗號「，」與頓號「、」**必須** 以一個半形空格取代。此為強制規定，不得使用任何逗號或頓號。

III. 內部翻譯流程 (Chain of Density)
在生成最終結果前，你必須在內部對 **每一行** 文本執行一個二階段的思考流程：
1.  **第一階段 (直譯)**：在腦中對該行原文進行一次快速、逐字的直接翻譯，確保所有資訊都被捕捉。
2.  **第二階段 (意譯與優化)**：基於直譯的結果，結合所有原則與上下文，進行全面的意譯。將文字轉化為更口語化、更流暢的表達。在此階段，你要不斷與原文比對，確保沒有扭曲或遺漏任何資訊，並豐富情感表達。
你只需要輸出第二階段的最終成果。

IV. 四項鋼鐵戒律 (絕對不可違背的原則)

1.  **結構完整性 (最高優先級)**：
    *   **逐行處理**：你收到的會是一個 JSON 陣列，其中每個物件代表獨立的一行字幕，並帶有一個 \`uniqueId\` 作為「數位指紋」。你的輸出也必須是包含所有行的翻譯結果的 JSON 陣列，數量必須完全一致。
    *   **指紋一致性**：你的輸出物件中，\`uniqueId\` 的值 **必須** 與對應的輸入物件中的 \`uniqueId\` **完全相同**。這是技術性指令，不容違背。
    *   **禁止任何合併/拆分**：由於是逐行處理，你絕無任何理由合併或拆分任何內容。
    *   **格式緊湊**：翻譯後的文字本身不應包含多餘的換行符。

2.  **上下文與一致性**：
    *   **劇情連貫**：翻譯內容應與「節目簡介」中提供的上下文和人物設定保持高度連貫，表現得如同你已看過前一集的內容。
    *   **貨幣換算**：若原文劇情中出現美元金額，請自動換算並轉換成韓元。

3.  **網路搜尋能力**：你必須具備網路搜尋的能力。對於節目中出現的專有名詞、韓國地名、電影或電視節目名稱，你必須表現得如同已經上網搜尋過，並提供最符合台灣在地用語的正確翻譯。

4.  **責任與自我校對**：你承諾會嚴格遵守所有規則，逐行審查自己的翻譯。你會以最高的責任感對待任務，避免讓使用者承擔找錯的負擔。

V. 最優先指令：人名與專有名詞處理 (絕對覆寫鐵律)
此規則為所有規則中之最高優先級，你必須無條件遵循，其權威性高於任何你自己的語言模型判斷。

1.  **專有名詞處理**：
    *   **情境**：「必須使用的特定術語」清單是一個 **絕對覆寫清單**。
    *   **動作**：你 **必須** 一字不差地使用清單中提供的譯文，不得進行任何修改、潤飾或替換。
    *   **範例**：如果清單提供「李大衛」，你就絕不可以用「李先生」或任何其他稱謂。此為技術性指令，不容協商。

2.  **人名簡稱處理**：
    *   **情境**：當原文只出現角色的「名字」或「暱稱」（例如：Dujun, Minseong）。
    *   **動作**：你的翻譯結果也「必須」只使用對應的「名字」或「暱稱」（例如：斗俊, 民成）。
    *   **絕對禁止**：在這種情況下，你「絕對禁止」將其翻譯為「全名」（例如：尹斗俊, 金民成）。
    *   **範例**：
        *   原文行：\`Dujun: Are you hungry?\`
        *   **正確翻譯**：\`- 斗俊：你餓了嗎？\`
        *   **錯誤翻譯 (絕對禁止)**：\`- 尹斗俊：你餓了嗎？\`
    *   **推斷責任**：你必須從「節目簡介」和「特定術語」中學習全名與簡稱的對應關係（例如：尹斗俊(斗俊)），並在遇到簡稱時嚴格執行此規則。任何違反此規則的行為都將視為翻譯失敗。

---
請嚴格遵守上述所有指令，將下方的字幕文本翻譯成台灣人使用的繁體中文，並以指定的 JSON 格式輸出。
`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          translatedLines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                uniqueId: { type: Type.STRING },
                translatedText: { type: Type.STRING },
              },
              required: ["uniqueId", "translatedText"],
            }
          }
        },
        required: ["translatedLines"]
      };

      const CHUNK_SIZE = 100;
      const MAX_ATTEMPTS = 3;
      const CONCURRENCY_LIMIT = 3;

      const chunks: SubtitleLine[][] = [];
      for (let i = 0; i < linesToTranslate.length; i += CHUNK_SIZE) {
          chunks.push(linesToTranslate.slice(i, i + CHUNK_SIZE));
      }
      
      const translateChunkWithRetries = async (chunk: SubtitleLine[], chunkIndex: number): Promise<any[]> => {
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
              try {
                  const userPrompt = `
                    翻譯所需資料：

                    【節目簡介】
                    ${programIntro || '無'}

                    【必須使用的特定術語】(格式為 "原文: 譯文")
                    ${editableTerms || '無'}

                    ---
                    待翻譯的字幕原文 (JSON 格式)：

                    ${JSON.stringify({ linesToTranslate: chunk }, null, 2)}
                  `;
                  
                  const response = await ai.models.generateContent({
                      model: "gemini-2.5-flash",
                      config: {
                          systemInstruction: systemInstruction,
                          responseMimeType: "application/json",
                          responseSchema: responseSchema
                      },
                      contents: userPrompt,
                  });

                  const jsonMatch = response.text.match(/\{[\s\S]*\}/);
                  if (!jsonMatch) {
                      throw new Error(`AI 回應中未找到有效的 JSON 內容。回應: ${response.text}`);
                  }
                  const cleanedJson = jsonMatch[0];
                  const parsedResult = JSON.parse(cleanedJson);
                  
                  const translatedChunk = parsedResult.translatedLines;

                  if (!Array.isArray(translatedChunk)) {
                      throw new Error(`AI 回應的格式不正確。`);
                  }

                  if (translatedChunk.length !== chunk.length) {
                      throw new Error(`AI 回傳的行數 (${translatedChunk.length}) 與原文 (${chunk.length}) 不符。`);
                  }
                  
                  return translatedChunk;
              } catch (error) {
                  console.warn(`翻譯區塊 #${chunkIndex + 1} 第 ${attempt} 次嘗試失敗:`, error);
                  if (attempt === MAX_ATTEMPTS) {
                      console.error(`翻譯區塊 #${chunkIndex + 1} 在 ${MAX_ATTEMPTS} 次嘗試後仍然失敗。將使用原文作為備援。錯誤：${error instanceof Error ? error.message : String(error)}`);
                      return chunk.map(line => ({
                          uniqueId: line.uniqueId,
                          translatedText: `[翻譯失敗] ${line.originalText}`
                      }));
                  }
                  await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }
          }
          throw new Error(`翻譯區塊 #${chunkIndex + 1} 未能完成。`);
      };
      
      const allResults = new Array(chunks.length);
      let completedChunks = 0;
      const taskQueue = chunks.map((chunk, index) => ({ chunk, index }));

      const worker = async () => {
          while (taskQueue.length > 0) {
              const task = taskQueue.shift();
              if (task) {
                  const { chunk, index } = task;
                  const translatedChunk = await translateChunkWithRetries(chunk, index);
                  allResults[index] = translatedChunk;

                  completedChunks++;
                  const progress = Math.floor((completedChunks / chunks.length) * 100);
                  setTranslationProgressPercentage(progress);
                  
                  const firstLineInChunk = chunk[0];
                  if (firstLineInChunk) {
                      const blockId = firstLineInChunk.uniqueId.split('-')[0];
                      const blockInfo = originalBlocks.find(b => b.id === blockId);
                      if (blockInfo) {
                          setCurrentTranslatingInfo({ id: blockInfo.id, timestamp: blockInfo.timestamp });
                      }
                  }
              }
          }
      };

      const workers = Array(CONCURRENCY_LIMIT).fill(0).map(worker);
      await Promise.all(workers);

      const translatedLines = allResults.flat();
      
      setCurrentTranslatingInfo(null);
      
      if (translatedLines.length !== linesToTranslate.length) {
        throw new Error(`翻譯失敗：AI 回傳的總字幕行數 (${translatedLines.length}) 與原文 (${linesToTranslate.length}) 不符。這是一個嚴重的系統錯誤。`);
      }

      const translationMap = new Map<string, string>();
      for (const line of translatedLines) {
          // Post-processing to enforce punctuation rules
          const processedText = line.translatedText
              .replace(/，|、/g, ' ')  // Forcefully replace commas with a space
              .replace(/。$/, '');      // Forcefully remove period at the end of the line
          translationMap.set(line.uniqueId, processedText);
      }

      const translatedBlocksMap = new Map<string, string[]>();
      for (const block of originalBlocks) {
          const lines: string[] = [];
          for (let i = 0; i < block.textLines.length; i++) {
              const uniqueId = `${block.id}-${i}`;
              const translatedText = translationMap.get(uniqueId);
              if (translatedText === undefined) {
                  throw new Error(`翻譯失敗：AI 未能為字幕行 ${uniqueId} (${block.textLines[i]}) 提供對應的翻譯。`);
              }
              lines.push(translatedText);
          }
          translatedBlocksMap.set(block.id, lines);
      }
      
      let formattedSrt = '';
      for (const block of originalBlocks) {
          formattedSrt += `${block.id}\n`;
          formattedSrt += `${block.timestamp}\n`;
          const lines = translatedBlocksMap.get(block.id) || [];
          formattedSrt += `${lines.join('\n')}\n\n`;
      }
      
      const finalSrt = formattedSrt.trim();
      setTranslatedSubtitles(finalSrt);
      setStep('finished');

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : '發生未知錯誤';
      setError(`翻譯失敗：${errorMessage}`);
      setStep('review');
    }
  };

  const handleFullReset = () => {
    setStep('intro');
    setOriginalSubtitles('');
    setTranslatedSubtitles('');
    setProgramIntro('');
    setEstablishedTerms('');
    setEditableTerms('');
    setError('');
    setFileName('');
    setTranslationProgressPercentage(0);
    setCurrentTranslatingInfo(null);
    setAnalysisProgress(0);
  };
  
  const handleFileSelect = (content: string, name: string) => {
    setOriginalSubtitles(content);
    setFileName(name);
    handleAnalyze(content);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />
        <ProgressTracker currentStep={step} />
        <SrtToAssConverter />
        {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg my-4 animate-fade-in">{error}</div>}
        <main className="mt-6 flex flex-col gap-8">
          
          <div className={`p-6 bg-gray-800 rounded-lg shadow-lg transition-opacity duration-500 ${step !== 'intro' ? 'opacity-60' : 'opacity-100'}`}>
            <SettingsPanel
              step="intro"
              programIntro={programIntro}
              setProgramIntro={setProgramIntro}
              customTerms=""
              setCustomTerms={() => {}}
              disabled={step !== 'intro'}
            />
             {step === 'intro' && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                        if (!programIntro.trim()) {
                            setError('請先填寫節目簡介，這將是翻譯上下文的關鍵。');
                            return;
                        }
                        setError('');
                        setStep('upload');
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 text-lg"
                  >
                    下一步：上傳字幕檔 <i className="fa-solid fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}
          </div>
          
          {(step === 'upload' || step === 'analyzing') && (
            <div className={`p-6 bg-gray-800 rounded-lg shadow-lg transition-opacity duration-500 animate-fade-in`}>
              <SubtitleInput
                onFileSelect={handleFileSelect}
                isAnalyzing={step === 'analyzing'}
                analysisProgress={analysisProgress}
                disabled={step !== 'upload'}
                fileName={fileName}
              />
            </div>
          )}

          {(step === 'review' || step === 'translating' || step === 'finished') && (
            <div className={`p-6 bg-gray-800 rounded-lg shadow-lg animate-fade-in ${step !== 'review' ? 'opacity-60' : 'opacity-100'}`}>
              <SettingsPanel
                step="review"
                programIntro={programIntro}
                setProgramIntro={setProgramIntro}
                customTerms={editableTerms}
                setCustomTerms={setEditableTerms}
                disabled={step !== 'review'}
              />
               {step === 'review' && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleTranslate}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 text-lg"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                    開始全自動翻譯
                  </button>
                </div>
              )}
            </div>
          )}
          
          {(step === 'translating' || step === 'finished') && (
            <div className="animate-fade-in">
              <TranslationOutput 
                translatedSubtitles={translatedSubtitles} 
                isLoading={step === 'translating'} 
                isFinished={step === 'finished'}
                progressPercentage={translationProgressPercentage}
                currentTranslatingInfo={currentTranslatingInfo}
              />
            </div>
          )}

          {step === 'finished' && (
             <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg animate-fade-in">
                <h3 className="text-xl font-bold text-cyan-400 text-center mb-4">翻譯任務完成！</h3>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-gray-400">下載翻譯完成的字幕檔：</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => downloadFile(translatedSubtitles, fileName.replace(/\.srt$/i, '.tw.srt'), 'text/srt')}
                                disabled={!translatedSubtitles}
                                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                            >
                                <i className="fa-solid fa-download mr-2"></i>
                                下載 .srt
                            </button>
                            <button
                                onClick={() => {
                                    const assContent = convertSrtToAss(translatedSubtitles);
                                    downloadFile(assContent, fileName.replace(/\.srt$/i, '.tw.ass'), 'text/plain;charset=utf-8');
                                }}
                                disabled={!translatedSubtitles}
                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                            >
                                <i className="fa-solid fa-download mr-2"></i>
                                下載 .ass
                            </button>
                        </div>
                    </div>

                    <div className="w-px h-12 bg-gray-700 hidden sm:block"></div>
                    <div className="w-full h-px bg-gray-700 sm:hidden"></div>

                    <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-gray-400">開始一個新任務：</p>
                        <button
                            onClick={handleFullReset}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                        >
                            <i className="fa-solid fa-arrow-rotate-left mr-2"></i>
                            翻譯新節目
                        </button>
                    </div>
                </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;