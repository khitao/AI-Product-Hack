"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.generateNewComponent = exports.reviseComponent = void 0;
var openai_1 = require("openai");
var env_mjs_1 = require("~/env.mjs");
var utils_1 = require("~/utils/utils");
var llm_rag_1 = require("~/server/llm_rag"); // Импорт вашего RAG класса
var openai = new openai_1["default"]({
    apiKey: env_mjs_1.env.OPENAI_API_KEY
});
var openaiModelName = "gpt-4o-mini";
// Оригинальная функция для извлечения блока кода
var extractFirstCodeBlock = function (input) {
    var pattern = /```(\w+)?\n([\s\S]+?)\n```/g;
    var matches;
    while ((matches = pattern.exec(input)) !== null) {
        var language = matches[1];
        var codeBlock = matches[2];
        if (language === undefined || language === "tsx" || language === "json") {
            return codeBlock;
        }
    }
    throw new Error("No code block found in input");
};
// Логика для работы с диффом кода остаётся прежней
var containsDiff = function (message) {
    return (message.includes("<<<<<<< ORIGINAL") &&
        message.includes(">>>>>>> UPDATED") &&
        message.includes("=======\n"));
};
var applyDiff = function (code, diff) {
    var regex = /<<<<<<< ORIGINAL\n(.*?)=======\n(.*?)>>>>>>> UPDATED/gs;
    var match;
    while ((match = regex.exec(diff)) !== null) {
        var before = match[1], after = match[2];
        var regex_1 = utils_1.escapeRegExp(before);
        regex_1 = regex_1.replaceAll(/\r?\n/g, "\\s+");
        regex_1 = regex_1.replaceAll(/\t/g, "");
        var replaceRegex = new RegExp(regex_1);
        code = code.replace(replaceRegex, after);
    }
    return code;
};
// Основная функция для исправления компонентов с использованием RAG и OpenAI
function reviseComponent(prompt, code) {
    return __awaiter(this, void 0, void 0, function () {
        var searchResults, completion, choices, diff, newCode;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, llm_rag_1.llm.answerIndex(prompt)];
                case 1:
                    searchResults = _a.sent();
                    return [4 /*yield*/, openai.chat.completions.create({
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
                                        "Always give answers by modifying the following code:\n```tsx\n" + code + "\n```",
                                        "Here is the additional context from the database:\n" + searchResults,
                                    ].join("\n")
                                },
                                {
                                    role: "user",
                                    content: "" + prompt
                                },
                            ],
                            temperature: 0,
                            top_p: 1,
                            frequency_penalty: 0,
                            presence_penalty: 0,
                            max_tokens: 2000,
                            n: 1
                        })];
                case 2:
                    completion = _a.sent();
                    choices = completion.choices;
                    if (!choices || choices.length === 0 || !choices[0] || !choices[0].message || !choices[0].message.content) {
                        throw new Error("No choices returned from OpenAI");
                    }
                    diff = choices[0].message.content;
                    if (!containsDiff(diff)) {
                        throw new Error("No diff found in message");
                    }
                    newCode = applyDiff(code, diff);
                    return [2 /*return*/, newCode];
            }
        });
    });
}
exports.reviseComponent = reviseComponent;
// Аналогичная функция для генерации нового компонента с контекстом от RAG
function generateNewComponent(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var searchResults, completion, choices, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, llm_rag_1.llm.answerIndex(prompt)];
                case 1:
                    searchResults = _a.sent();
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: openaiModelName,
                            messages: [
                                {
                                    role: "system",
                                    content: [
                                        "You are a helpful assistant.",
                                        "You're tasked with writing a react component using typescript and tailwind for a website.",
                                        "Only import React as a dependency.",
                                        "Here is the additional context from the database:\n" + searchResults,
                                        "Be concise and only reply with code.",
                                    ].join("\n")
                                },
                                {
                                    role: "user",
                                    content: [
                                        "- Component Name: Section",
                                        "- Component Description: " + prompt + "\n",
                                        "- Do not use libraries or imports other than React.",
                                        "- Do not have any dynamic data. Use placeholders as data. Do not use props.",
                                        "- Write only a single component.",
                                    ].join("\n")
                                },
                            ],
                            temperature: 0.1,
                            top_p: 3,
                            frequency_penalty: 0,
                            presence_penalty: 0,
                            max_tokens: 20000,
                            n: 1
                        })];
                case 2:
                    completion = _a.sent();
                    choices = completion.choices;
                    if (!choices || choices.length === 0 || !choices[0] || !choices[0].message) {
                        throw new Error("No choices returned from OpenAI");
                    }
                    result = choices[0].message.content || "";
                    result = extractFirstCodeBlock(result);
                    return [2 /*return*/, result];
            }
        });
    });
}
exports.generateNewComponent = generateNewComponent;
