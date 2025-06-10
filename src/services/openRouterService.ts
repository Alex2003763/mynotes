
import { OPENROUTER_API_BASE_URL, DEFAULT_AI_MODEL_ID } from '../constants';
import { OpenRouterMessage, OpenRouterRequestBody, OpenRouterResponse } from '../types';

let currentApiKey = '';

export const updateOpenRouterApiKey = (key: string): void => {
  currentApiKey = key;
};

const callOpenRouterAPI = async <T,>(requestBody: OpenRouterRequestBody): Promise<T> => {
  if (!currentApiKey) {
    throw new Error('OpenRouter API key is not set. Please configure it in settings.');
  }
  if (!requestBody.model) {
    console.warn('No model specified for OpenRouter API call, defaulting to general model.');
    requestBody.model = DEFAULT_AI_MODEL_ID; // Fallback, though ideally model should always be passed
  }

  const response = await fetch(`${OPENROUTER_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin, 
      'X-Title': 'MyNotes App', 
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Unknown error structure' }));
    console.error('OpenRouter API Error:', errorBody);
    const errorMessage = errorBody.error?.message || response.statusText || 'API request failed';
    throw new Error(`OpenRouter API request failed: ${errorMessage} (Status: ${response.status})`);
  }
  return response.json() as Promise<T>;
};

export const summarizeText = async (text: string, length: 'short' | 'bullet', language: 'en' | 'zh' = 'en', modelId: string): Promise<string> => {
  const systemContent = language === 'zh'
    ? '你是一位专业的摘要员。提供清晰简洁的中文摘要。如果重要的实体、链接或代码片段对摘要的上下文至关重要，请予以保留。重要：仅输出摘要内容，不要包含任何介绍性短语、解释或对话性评论。'
    : 'You are an expert summarizer. Provide clear and concise summaries in English. Preserve important entities, links, or code snippets if they are crucial to the summary_s context. Important: Output ONLY the summary, without any introductory phrases, explanations, or conversational remarks.';

  const userPrompt = length === 'short'
    ? (language === 'zh' ? `将以下文本总结成一个简洁的段落。\n\n文本：\n${text}` : `Summarize the following text into a concise paragraph.\n\nText:\n${text}`)
    : (language === 'zh' ? `从以下文本中提取要点，并以项目符号列表的形式呈现。\n\n文本：\n${text}` : `Extract the key points from the following text and present them as a bulleted list.\n\nText:\n${text}`);
  
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userPrompt }
  ];

  const requestBody: OpenRouterRequestBody = {
    model: modelId,
    messages: messages,
    max_tokens: length === 'short' ? 150 : 250,
    temperature: 0.5,
  };

  const response = await callOpenRouterAPI<OpenRouterResponse>(requestBody);
  return response.choices[0]?.message?.content?.trim() || (language === 'zh' ? '未能生成摘要。' : 'No summary available.');
};

export const correctGrammarAndSpelling = async (text: string, language: 'en' | 'zh' = 'en', modelId: string): Promise<string> => {
  const systemContent = language === 'zh'
    ? '你是一个中文语法和拼写校对专家。请修正文本中的语法和拼写错误。请保留原文的 Markdown 格式，例如链接、图片、代码块、列表和标题等。重要：仅返回修正后的文本。如果不需要修正，请返回原文。不要包含任何介绍性短语、解释或对话性评论。'
    : 'You are an expert proofreader. Correct grammar and spelling mistakes. Preserve original markdown formatting such as links, images, code blocks, lists, and headings. Important: Return ONLY the corrected text. If no corrections are needed, return the original text. Do not include any introductory phrases, explanations, or conversational remarks.';
  const userPrompt = language === 'zh'
    ? `请修正以下文本：\n\n${text}`
    : `Please correct the following text:\n\n${text}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userPrompt }
  ];
  
  const requestBody: OpenRouterRequestBody = {
    model: modelId,
    messages: messages,
    temperature: 0.3,
  };

  const response = await callOpenRouterAPI<OpenRouterResponse>(requestBody);
  return response.choices[0]?.message?.content?.trim() || text;
};

export const expandContent = async (selectedText: string, instruction: string, language: 'en' | 'zh' = 'en', modelId: string): Promise<string> => {
  const systemContent = language === 'zh'
    ? '你是一位富有创造力的写作助手。根据用户的指示帮助扩展和阐述给定的文本。在您的回复中，请保持原有的 Markdown 格式，例如链接、图片、代码块、列表和标题等。重要：仅输出扩展或阐述后的文本，不要包含任何介绍性短语、解释或对话性评论。'
    : 'You are a creative writing assistant. Help expand and elaborate on given text based on user instructions. Maintain the original markdown formatting for elements like links, images, code blocks, lists, and headings in your response. Important: Output ONLY the expanded or elaborated text, without any introductory phrases, explanations, or conversational remarks.';
  const userPrompt = language === 'zh'
    ? `指令：${instruction}\n\n待处理文本：“${selectedText}”\n\n请提供扩展或润色后的内容。`
    : `Instruction: ${instruction}\n\nText to work with: "${selectedText}"\n\nPlease provide the expanded or elaborated content.`;
  
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userPrompt }
  ];

  const requestBody: OpenRouterRequestBody = {
    model: modelId,
    messages: messages,
    max_tokens: 300,
    temperature: 0.7,
  };

  const response = await callOpenRouterAPI<OpenRouterResponse>(requestBody);
  return response.choices[0]?.message?.content?.trim() || (language === 'zh' ? '无法扩展内容。' : 'Could not expand content.');
};

export const suggestTags = async (noteContent: string, language: 'en' | 'zh' = 'en', modelId: string): Promise<string[]> => {
  const langSystemInstruction = language === 'zh'
    ? '你是内容分析和标签建议专家。为给定文本建议相关标签。以逗号分隔的列表形式提供标签，例如：“科技, 编程, Web开发”。建议3-5个相关标签。'
    : 'You are an expert in content analysis and tagging. Suggest relevant tags for the given text. Provide tags as a comma-separated list. For example: "technology, programming, web development". Suggest 3-5 relevant tags.';
  const langUserPrompt = language === 'zh'
    ? `分析以下笔记内容并建议相关标签：\n\n${noteContent}`
    : `Analyze the following note content and suggest relevant tags:\n\n${noteContent}`;

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: langSystemInstruction },
    { role: 'user', content: langUserPrompt }
  ];

  const requestBody: OpenRouterRequestBody = {
    model: modelId,
    messages: messages,
    temperature: 0.5,
  };

  const response = await callOpenRouterAPI<OpenRouterResponse>(requestBody);
  const tagsString = response.choices[0]?.message?.content?.trim();
  if (tagsString) {
    return tagsString.split(/,|，/).map(tag => tag.trim()).filter(tag => tag.length > 0); // Support both English and Chinese commas
  }
  return [];
};

export const answerQuestionFromNote = async (question: string, noteContent: string, language: 'en' | 'zh' = 'en', modelId: string): Promise<string> => {
  const langSystemInstruction = language === 'zh'
    ? '你是一个乐于助人的助手。请仅根据提供的笔记内容回答用户的问题。如果答案不在笔记中，请说“答案未在此笔记中找到。”'
    : 'You are a helpful assistant. Answer the user_s question based ONLY on the provided note content. If the answer is not in the note, say "The answer is not found in this note."';
  const langUserPrompt = language === 'zh'
    ? `笔记内容：\n“\n${noteContent}\n”\n\n问题：${question}`
    : `Note Content:\n"""\n${noteContent}\n"""\n\nQuestion: ${question}`;
  
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: langSystemInstruction },
    { role: 'user', content: langUserPrompt }
  ];

  const requestBody: OpenRouterRequestBody = {
    model: modelId, 
    messages: messages,
    temperature: 0.3,
  };

  const response = await callOpenRouterAPI<OpenRouterResponse>(requestBody);
  return response.choices[0]?.message?.content?.trim() || (language === 'zh' ? '无法回答问题。' : 'Could not answer the question.');
};

export const checkApiKeyValidity = async (): Promise<boolean> => {
  if (!currentApiKey) return false;
  try {
    const messages: OpenRouterMessage[] = [{ role: 'user', content: 'Hello' }];
    const requestBody: OpenRouterRequestBody = {
      model: DEFAULT_AI_MODEL_ID, // Use a default cheap model for validation
      messages: messages,
      max_tokens: 5,
    };
    await callOpenRouterAPI<OpenRouterResponse>(requestBody);
    return true;
  } catch (error) {
    return false;
  }
};
