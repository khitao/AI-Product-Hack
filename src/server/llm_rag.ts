import { ChromaClient } from 'chromadb'; 
import { OpenAI } from 'openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

class LLM {
  private clientChroma: any;
  private modelLLM: string;
  private clientLLM: any;
  private openai: any;

  constructor(model = 'gpt-4o-mini') {
    this.clientChroma = this.connectToChroma();
    this.modelLLM = model;
    this.clientLLM = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  connectToChroma() {
    const chromaClient = new ChromaClient({
        path: "http://localhost:8000"
    });
    return chromaClient;
  }

  async getEmbeddings(text: string) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  countTokens(text: string): number {
    const encoding = this.clientLLM.encoding_for_model(this.modelLLM);
    return encoding.encode(text).length;
  }

  async answerIndex(userPrompt: string, temp = 0.1): Promise<any> {
    console.log('Поиск ответа в индексе...');

    const vectorStore = await this.clientChroma.collection('components', {
      embedding_function: this.getEmbeddings.bind(this),
    });

    if (!vectorStore) {
      console.log('Модель не содержит данных в Chroma!!!');
      return { answer: '', log: 'Нет данных в индексе.' };
    }

    console.log(`Количество документов в индексе: ${vectorStore.count()}`);

    const retriever = vectorStore.asRetriever({
      search_type: 'similarity',
      k: 4,
    });

    const docs = await retriever.invoke(userPrompt);
    console.log(`Найдено ${docs.length} документов по запросу`);

    if (!docs || docs.length === 0) {
      return { answer: '', log: 'Документы не найдены.' };
    }

    const mergedDocs = docs.map(doc => `Name component: ${doc.metadata.title}\nFull code: ${doc.metadata.full_code}`).join('\n\n');

    const template = `
      You are the designer of the system design.
      Your main role on the issue of using the source is to provide the most relevant code for the user interface.
      
      Question: {question}
      Context: {source_documents}
      Answer: ""
    `;
    const prompt = ChatPromptTemplate.fromTemplate(template);

    const finalAnswer = await this.clientLLM.chat.completions.create({
      model: this.modelLLM,
      messages: [
        {
          role: 'system',
          content: prompt.format({
            question: userPrompt,
            source_documents: mergedDocs,
          }),
        },
      ],
      temperature: temp,
    });

    const answerTokens = this.countTokens(finalAnswer.choices[0].message.content);
    const log = `Токенов использовано: ${answerTokens}`;

    console.log('Запрос к модели завершен');
    return { answer: finalAnswer.choices[0].message.content, log };
  }
}

export const llm = new LLM();
