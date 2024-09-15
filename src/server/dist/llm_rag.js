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
exports.llm = void 0;
var chromadb_1 = require("chromadb");
var openai_1 = require("openai");
var prompts_1 = require("@langchain/core/prompts");
var LLM = /** @class */ (function () {
    function LLM(model) {
        if (model === void 0) { model = 'gpt-4o-mini'; }
        this.clientChroma = this.connectToChroma();
        this.modelLLM = model;
        this.clientLLM = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    LLM.prototype.connectToChroma = function () {
        var chromaClient = new chromadb_1.ChromaClient({
            path: "http://localhost:8000"
        });
        return chromaClient;
    };
    LLM.prototype.getEmbeddings = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.openai.embeddings.create({
                            model: 'text-embedding-3-small',
                            input: text
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data[0].embedding];
                }
            });
        });
    };
    LLM.prototype.countTokens = function (text) {
        var encoding = this.clientLLM.encoding_for_model(this.modelLLM);
        return encoding.encode(text).length;
    };
    LLM.prototype.answerIndex = function (userPrompt, temp) {
        if (temp === void 0) { temp = 0.1; }
        return __awaiter(this, void 0, Promise, function () {
            var vectorStore, retriever, docs, mergedDocs, template, prompt, finalAnswer, answerTokens, log;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('Поиск ответа в индексе...');
                        return [4 /*yield*/, this.clientChroma.collection('components', {
                                embedding_function: this.getEmbeddings.bind(this)
                            })];
                    case 1:
                        vectorStore = _a.sent();
                        if (!vectorStore) {
                            console.log('Модель не содержит данных в Chroma!!!');
                            return [2 /*return*/, { answer: '', log: 'Нет данных в индексе.' }];
                        }
                        console.log("\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u0432 \u0438\u043D\u0434\u0435\u043A\u0441\u0435: " + vectorStore.count());
                        retriever = vectorStore.asRetriever({
                            search_type: 'similarity',
                            k: 4
                        });
                        return [4 /*yield*/, retriever.invoke(userPrompt)];
                    case 2:
                        docs = _a.sent();
                        console.log("\u041D\u0430\u0439\u0434\u0435\u043D\u043E " + docs.length + " \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 \u043F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443");
                        if (!docs || docs.length === 0) {
                            return [2 /*return*/, { answer: '', log: 'Документы не найдены.' }];
                        }
                        mergedDocs = docs.map(function (doc) { return "Name component: " + doc.metadata.title + "\nFull code: " + doc.metadata.full_code; }).join('\n\n');
                        template = "\n      You are the designer of the system design.\n      Your main role on the issue of using the source is to provide the most relevant code for the user interface.\n      \n      Question: {question}\n      Context: {source_documents}\n      Answer: \"\"\n    ";
                        prompt = prompts_1.ChatPromptTemplate.fromTemplate(template);
                        return [4 /*yield*/, this.clientLLM.chat.completions.create({
                                model: this.modelLLM,
                                messages: [
                                    {
                                        role: 'system',
                                        content: prompt.format({
                                            question: userPrompt,
                                            source_documents: mergedDocs
                                        })
                                    },
                                ],
                                temperature: temp
                            })];
                    case 3:
                        finalAnswer = _a.sent();
                        answerTokens = this.countTokens(finalAnswer.choices[0].message.content);
                        log = "\u0422\u043E\u043A\u0435\u043D\u043E\u0432 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u043E: " + answerTokens;
                        console.log('Запрос к модели завершен');
                        return [2 /*return*/, { answer: finalAnswer.choices[0].message.content, log: log }];
                }
            });
        });
    };
    return LLM;
}());
exports.llm = new LLM();
