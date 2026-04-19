const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY as string;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

if (!DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY is not set. Please add it to your .env.local file.");
}

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const callDeepSeek = async (messages: DeepSeekMessage[], jsonResponse: boolean = true): Promise<string> => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key is not configured. Please set DEEPSEEK_API_KEY in your .env.local file.");
  }

  console.log("Calling DeepSeek API with key:", DEEPSEEK_API_KEY.substring(0, 10) + "...");

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      response_format: jsonResponse ? { type: "json_object" } : undefined,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data: DeepSeekResponse = await response.json();
  return data.choices[0].message.content;
};

export const analyzeWriting = async (text: string, grade: string, rubric?: string) => {
  const systemInstruction = `You are an expert ESL (English as a Second Language) writing tutor. 
Your goal is to help students improve their writing by providing constructive, encouraging, and specific feedback.
The student is in ${grade}. 
${rubric ? `Use this rubric for grading: ${rubric}` : `Grade the student based on standard expectations for ${grade}.`}

Provide your feedback in JSON format with the following structure:
{
  "summary": "High-level overview of the writing.",
  "score": "A score or grade (e.g., 7.5/10 or B+).",
  "problematicSentences": [
    {
      "sentence": "The exact sentence from the original text that has problems.",
      "type": "Grammar" | "Vocabulary" | "Structure" | "Tone" | "Spelling" | "Punctuation",
      "description": "What is the problem with this sentence?",
      "fix": "How to fix it or a better version."
    }
  ],
  "keyTakeaways": ["Rule 1", "Rule 2"]
}`;

  const response = await callDeepSeek([
    { role: "system", content: systemInstruction },
    { role: "user", content: `Here is the student's writing:\n\n${text}` },
  ]);

  return JSON.parse(response || "{}");
};

export const generateExercises = async (problematicSentences: any[], grade: string) => {
  const systemInstruction = `You are an ESL tutor. Based on the following writing problems identified for a ${grade} student, generate 3-4 practice exercises.
Each exercise should target a specific problem type and use DIFFERENT formats: multiple choice, fill-in-the-blank, or sentence ordering.

Provide the response in JSON format:
{
  "exercises": [
    {
      "title": "Exercise Title",
      "type": "multiple-choice" | "fill-blank" | "ordering",
      "instruction": "What the student should do.",
      "questions": [
        {
          "question": "The question or sentence with blanks (use ___ for blanks).",
          "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
          "answer": "The correct answer (for multiple-choice: the letter, for fill-blank: the word, for ordering: correct sequence).",
          "explanation": "Why this is the correct answer."
        }
      ]
    }
  ]
}`;

  const response = await callDeepSeek([
    { role: "system", content: systemInstruction },
    { role: "user", content: `Problems identified: ${JSON.stringify(problematicSentences)}` },
  ]);

  return JSON.parse(response || "{}");
};
