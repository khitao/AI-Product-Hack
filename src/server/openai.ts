import OpenAI from "openai";
import { env } from "~/env.mjs";
import { escapeRegExp } from "~/utils/utils";
import { llm } from "~/server/llm_rag";  // Импорт вашего RAG класса

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
const openaiModelName = "gpt-4o-mini";

// Оригинальная функция для извлечения блока кода
const extractFirstCodeBlock = (input: string) => {
  const pattern = /```(\w+)?\n([\s\S]+?)\n```/g;
  let matches;
  while ((matches = pattern.exec(input)) !== null) {
    const language = matches[1];
    const codeBlock = matches[2];
    if (language === undefined || language === "tsx" || language === "json") {
      return codeBlock as string;
    }
  }
  throw new Error("No code block found in input");
};

// Логика для работы с диффом кода остаётся прежней
const containsDiff = (message: string) => {
  return (
    message.includes("<<<<<<< ORIGINAL") &&
    message.includes(">>>>>>> UPDATED") &&
    message.includes("=======\n")
  );
};

const applyDiff = (code: string, diff: string) => {
  const regex = /<<<<<<< ORIGINAL\n(.*?)=======\n(.*?)>>>>>>> UPDATED/gs;
  let match;

  while ((match = regex.exec(diff)) !== null) {
    const [, before, after] = match;
    let regex = escapeRegExp(before!);
    regex = regex.replaceAll(/\r?\n/g, "\\s+");
    regex = regex.replaceAll(/\t/g, "");
    const replaceRegex = new RegExp(regex);
    code = code.replace(replaceRegex, after!);
  }

  return code;
};

// Основная функция для исправления компонентов с использованием RAG и OpenAI
export async function reviseComponent(prompt: string, code: string) {
  // Получаем контекст через RAG
  const searchResults = await llm.answerIndex(prompt);

  // Формируем запрос с контекстом от RAG
  const completion = await openai.chat.completions.create({
    model: openaiModelName,
    messages: [
      {
        role: "system",
        content: [
          "You are an AI programming assistant.",
          "Follow the user's requirements carefully & to the letter.",
          "You're working on a react component using typescript and tailwind.",
          "Don't introduce any new components or files.",
          "First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.",
          "You must format every code change with an *edit block* like this:",
          "```",
          "<<<<<<< ORIGINAL",
          "    # some comment",
          "    # Func to multiply",
          "=======",
          "    # updated comment",
          "    # Function to add",
          "    def add(a,b):",
          ">>>>>>> UPDATED",
          "```",
          "There can be multiple code changes.",
          "Modify as few characters as possible and use as few characters as possible on the diff.",
          "Minimize any other prose.",
          "Keep your answers short and impersonal.",
          "Never create a new component or file.",
          `Always give answers by modifying the following code:\n\`\`\`tsx\n${code}\n\`\`\``,
          `Here is the additional context from the database:\n${searchResults}`, // Добавляем контекст от RAG
        ].join("\n"),
      },
      {
        role: "user",
        content: `${prompt}`,
      },
    ],
    temperature: 0,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000,
    n: 1,
  });

  const choices = completion.choices;

  if (!choices || choices.length === 0 || !choices[0] || !choices[0].message || !choices[0].message.content) {
    throw new Error("No choices returned from OpenAI");
  }

  const diff = choices[0].message.content;

  if (!containsDiff(diff)) {
    throw new Error("No diff found in message");
  }

  const newCode = applyDiff(code, diff);
  return newCode;
}

// Аналогичная функция для генерации нового компонента с контекстом от RAG
export async function generateNewComponent(prompt: string) {
  const searchResults = await llm.answerIndex(prompt);  // RAG поиск

  const completion = await openai.chat.completions.create({
    model: openaiModelName,
    messages: [
      {
        role: "system",
        content: [
          "You are a helpful assistant.",
          "You're tasked with writing a react component using typescript and tailwind for a website.",
          "Only import React as a dependency.",
          `Here is the additional context from the database:\n${searchResults}`, // Контекст от RAG
          "Be concise and only reply with code.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `- Component Name: Section`,
          `- Component Description: ${prompt}\n`,
          `- Do not use libraries or imports other than React.`,
          `- Do not have any dynamic data. Use placeholders as data. Do not use props.`,
          `- Write only a single component.`,
        ].join("\n"),
      },
    ],
    temperature: 0.1,
    top_p: 3,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 20000,
    n: 1,
  });

  const choices = completion.choices;

  if (!choices || choices.length === 0 || !choices[0] || !choices[0].message) {
    throw new Error("No choices returned from OpenAI");
  }

  let result = choices[0].message.content || "";
  result = extractFirstCodeBlock(result);

  return result;
}
