import { GEMINI_API_BASE_URL } from '../constants';

let currentApiKey = '';
let isCurrentKeyKnownValid = false;

export const updateGeminiApiKey = (key: string): void => {
  if (currentApiKey !== key) {
    currentApiKey = key;
    isCurrentKeyKnownValid = false;
  }
};

interface GeminiContent {
  parts: { text: string }[];
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  systemInstruction?: {
    parts: { text: string }[];
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

const callGeminiAPI = async <T,>(requestBody: GeminiRequestBody, modelId: string = 'gemini-2.0-flash'): Promise<T> => {
  if (!currentApiKey) {
    throw new Error('Gemini API key is not set. Please configure it in settings.');
  }

  console.log('Calling Gemini API:', modelId, requestBody);
  const response = await fetch(`${GEMINI_API_BASE_URL}/v1beta/models/${modelId}:generateContent?key=${currentApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error structure' }));
    console.error('Gemini API Error:', errorBody);
    const errorMessage = errorBody.error?.message || response.statusText || 'API request failed';
    throw new Error(`Gemini API request failed: ${errorMessage} (Status: ${response.status})`);
  }
  const result = await response.json() as Promise<T>;
  console.log('Gemini API response:', result);
  return result;
};

const callGeminiAPIStreaming = async (
  requestBody: GeminiRequestBody,
  modelId: string = 'gemini-2.0-flash',
  onChunk: (chunk: string) => void
): Promise<void> => {
  if (!currentApiKey) {
    throw new Error('Gemini API key is not set. Please configure it in settings.');
  }

  const streamRequestBody = { ...requestBody };

  const response = await fetch(`${GEMINI_API_BASE_URL}/v1beta/models/${modelId}:streamGenerateContent?key=${currentApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(streamRequestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error structure' }));
    console.error('Gemini API Error:', errorBody);
    const errorMessage = errorBody.error?.message || response.statusText || 'API request failed';
    throw new Error(`Gemini API request failed: ${errorMessage} (Status: ${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

  try {
    let buffer = '';
    let currentJsonObject = '';
    let braceCount = 0;
    let inJsonObject = false;
    let remainingBytes = new Uint8Array(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Combine remaining bytes from previous iteration with new chunk
      const combinedBytes = new Uint8Array(remainingBytes.length + value.length);
      combinedBytes.set(remainingBytes);
      combinedBytes.set(value, remainingBytes.length);

      // Try to decode as much as possible without cutting multi-byte characters
      let chunk = '';
      let bytesToProcess = combinedBytes.length;
      
      // Try decoding progressively from the end to find a safe cut point
      for (let i = combinedBytes.length; i >= Math.max(0, combinedBytes.length - 4); i--) {
        try {
          const testChunk = decoder.decode(combinedBytes.slice(0, i), { stream: true });
          chunk = testChunk;
          bytesToProcess = i;
          break;
        } catch (e) {
          // Continue trying with fewer bytes
        }
      }
      
      // Store remaining bytes for next iteration
      remainingBytes = combinedBytes.slice(bytesToProcess);
      
      buffer += chunk;
      
      // Process character by character to properly handle JSON boundaries
      for (let i = 0; i < buffer.length; i++) {
        const char = buffer[i];
        
        if (char === '{') {
          if (!inJsonObject) {
            inJsonObject = true;
            currentJsonObject = '';
          }
          braceCount++;
          currentJsonObject += char;
        } else if (char === '}') {
          if (inJsonObject) {
            braceCount--;
            currentJsonObject += char;
            
            // Complete JSON object found
            if (braceCount === 0) {
              try {
                const parsed = JSON.parse(currentJsonObject);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                console.warn('Failed to parse JSON object:', currentJsonObject, e);
              }
              
              inJsonObject = false;
              currentJsonObject = '';
            }
          }
        } else if (inJsonObject) {
          currentJsonObject += char;
        }
      }
      
      // Clear processed buffer
      buffer = '';
    }
    
    // Process any remaining bytes at the end
    if (remainingBytes.length > 0) {
      const finalChunk = decoder.decode(remainingBytes, { stream: false });
      if (finalChunk && inJsonObject) {
        currentJsonObject += finalChunk;
        try {
          const parsed = JSON.parse(currentJsonObject);
          const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.warn('Failed to parse final JSON object:', currentJsonObject, e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

export const summarizeTextStreaming = async (
  text: string,
  length: 'short' | 'bullet',
  language: 'en' | 'zh' = 'en',
  modelId: string = 'gemini-2.0-flash',
  systemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  const defaultSystemContent = language === 'zh'
    ? '你是一位專業的摘要員。請使用標準的繁體中文提供清晰簡潔的摘要。如果重要的實體、連結或程式碼片段對摘要的上下文至關重要，請予以保留。重要：僅輸出摘要內容，不要包含任何介紹性短語、解釋或對話性評論。'
    : 'You are an expert summarizer. Provide clear and concise summaries in English. Preserve important entities, links, or code snippets if they are crucial to the summary context. Important: Output ONLY the summary, without any introductory phrases, explanations, or conversational remarks.';

  const systemContent = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : defaultSystemContent;

  const userPrompt = length === 'short'
    ? (language === 'zh' ? `將以下文本總結成一個簡潔的段落。\n\n文本：\n${text}` : `Summarize the following text into a concise paragraph.\n\nText:\n${text}`)
    : (language === 'zh' ? `從以下文本中提取要點，並以項目符號列表的形式呈現。\n\n文本：\n${text}` : `Extract the key points from the following text and present them as a bulleted list.\n\nText:\n${text}`);

  const requestBody: GeminiRequestBody = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemContent }] },
    generationConfig: {
      temperature: 0.5,
    },
  };

  await callGeminiAPIStreaming(requestBody, modelId, onChunk);
};

export const correctGrammarAndSpellingStreaming = async (
  text: string,
  language: 'en' | 'zh' = 'en',
  modelId: string = 'gemini-2.0-flash',
  systemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  const defaultSystemContent = language === 'zh'
    ? '你是一個繁體中文（台灣）語法和拼寫校對專家。請使用標準的繁體中文修正文本中的語法和拼寫錯誤，避免使用粵語或方言詞彙。請保留原文的 Markdown 格式，例如連結、圖片、程式碼區塊、列表和標題等。重要：僅返回修正後的文本。如果不需要修正，請返回原文。不要包含任何介紹性短語、解釋或對話性評論。'
    : 'You are an expert proofreader. Correct grammar and spelling mistakes. Preserve original markdown formatting such as links, images, code blocks, lists, and headings. Important: Return ONLY the corrected text. If no corrections are needed, return the original text. Do not include any introductory phrases, explanations, or conversational remarks.';

  const systemContent = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : defaultSystemContent;
  const userPrompt = language === 'zh'
    ? `請修正以下文本：\n\n${text}`
    : `Please correct the following text:\n\n${text}`;

  const requestBody: GeminiRequestBody = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemContent }] },
    generationConfig: {
      temperature: 0.3,
    },
  };

  await callGeminiAPIStreaming(requestBody, modelId, onChunk);
};

export const expandContentStreaming = async (
  selectedText: string,
  instruction: string,
  language: 'en' | 'zh' = 'en',
  modelId: string = 'gemini-2.0-flash',
  systemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  const defaultSystemContent = language === 'zh'
    ? '你是一位富有創造力的寫作助手。請使用標準的繁體中文（台灣）根據用戶的指示幫助擴展和闡述給定的文本，避免使用粵語或方言詞彙。在您的回覆中，請保持原有的 Markdown 格式，例如連結、圖片、程式碼區塊、列表和標題等。重要：僅輸出擴展或闡述後的文本，不要包含任何介紹性短語、解釋或對話性評論。'
    : 'You are a creative writing assistant. Help expand and elaborate on given text based on user instructions. Maintain the original markdown formatting for elements like links, images, code blocks, lists, and headings in your response. Important: Output ONLY the expanded or elaborated text, without any introductory phrases, explanations, or conversational remarks.';

  const systemContent = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : defaultSystemContent;
  const userPrompt = language === 'zh'
    ? `指令：${instruction}\n\n待處理文本："${selectedText}"\n\n請提供擴展或潤色後的內容。`
    : `Instruction: ${instruction}\n\nText to work with: "${selectedText}"\n\nPlease provide the expanded or elaborated content.`;

  const requestBody: GeminiRequestBody = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemContent }] },
    generationConfig: {
      temperature: 0.7,
    },
  };

  await callGeminiAPIStreaming(requestBody, modelId, onChunk);
};

export const answerQuestionFromNoteStreaming = async (
  question: string,
  noteContent: string,
  language: 'en' | 'zh' = 'en',
  modelId: string = 'gemini-2.0-flash',
  systemPrompt: string = '',
  onChunk: (chunk: string) => void
): Promise<void> => {
  const defaultSystemInstruction = language === 'zh'
    ? '你是一個樂於助人的助手。請使用標準的繁體中文（台灣）回答，避免使用粵語或方言詞彙。請僅根據提供的筆記內容回答用戶的問題。如果答案不在筆記中，請說"答案未在此筆記中找到。"'
    : 'You are a helpful assistant. Answer the user question based ONLY on the provided note content. If the answer is not in the note, say "The answer is not found in this note."';

  const systemContent = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : defaultSystemInstruction;
  const userPrompt = language === 'zh'
    ? `筆記內容：\n"""\n${noteContent}\n"""\n\n問題：${question}`
    : `Note Content:\n"""\n${noteContent}\n"""\n\nQuestion: ${question}`;

  const requestBody: GeminiRequestBody = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemContent }] },
    generationConfig: {
      temperature: 0.3,
    },
  };

  await callGeminiAPIStreaming(requestBody, modelId, onChunk);
};

export const suggestTags = async (
  noteContent: string,
  language: 'en' | 'zh' = 'en',
  modelId: string = 'gemini-2.0-flash',
  systemPrompt: string = ''
): Promise<string[]> => {
  const defaultSystemInstruction = language === 'zh'
    ? '你是內容分析和標籤建議專家。請使用標準的繁體中文為給定文本建議相關標籤以逗號分隔的列表形式提供標籤，例如："科技, 編程, Web開發"。建議3-5個相關標籤。'
    : 'You are an expert in content analysis and tagging. Suggest relevant tags for the given text. Provide tags as a comma-separated list. For example: "technology, programming, web development". Suggest 3-5 relevant tags.';

  const systemContent = (systemPrompt && systemPrompt.trim()) ? systemPrompt.trim() : defaultSystemInstruction;
  const userPrompt = language === 'zh'
    ? `分析以下筆記內容並建議相關標籤：\n\n${noteContent}`
    : `Analyze the following note content and suggest relevant tags:\n\n${noteContent}`;

  const requestBody: GeminiRequestBody = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemContent }] },
    generationConfig: {
      temperature: 0.5,
    },
  };

  const response = await callGeminiAPI<GeminiResponse>(requestBody, modelId);
  const tagsString = response.candidates[0]?.content?.parts[0]?.text?.trim();
  if (tagsString) {
    return tagsString.split(/,|，/).map(tag => tag.trim()).filter(tag => tag.length > 0);
  }
  return [];
};

export const checkApiKeyValidity = async (): Promise<boolean> => {
  if (!navigator.onLine) {
    return isCurrentKeyKnownValid;
  }

  if (!currentApiKey) {
    isCurrentKeyKnownValid = false;
    return false;
  }

  if (isCurrentKeyKnownValid) {
    return true;
  }

  try {
    const requestBody: GeminiRequestBody = {
      contents: [{ parts: [{ text: 'Hello' }] }],
      generationConfig: {
        maxOutputTokens: 5,
      },
    };
    await callGeminiAPI<GeminiResponse>(requestBody, 'gemini-2.0-flash');

    isCurrentKeyKnownValid = true;
    return true;
  } catch (error) {
    isCurrentKeyKnownValid = false;
    return false;
  }
};
