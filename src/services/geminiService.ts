import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const analyzeWriting = async (text: string, grade: string, rubric?: string) => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are an expert ESL (English as a Second Language) writing tutor. 
Your goal is to help students improve their writing by providing constructive, encouraging, and specific feedback.
The student is in ${grade}. 
${rubric ? `Use this rubric for grading: ${rubric}` : `Grade the student based on standard expectations for ${grade}.`}

Provide your feedback in JSON format with the following structure:
{
  "summary": "High-level overview of the writing.",
  "score": "A score or grade (e.g., 7.5/10 or B+).",
  "problems": [
    {
      "type": "Grammar" | "Vocabulary" | "Structure" | "Tone",
      "description": "What is the problem?",
      "examples": ["Original sentence/phrase"],
      "fix": "How to fix it or a better version."
    }
  ],
  "revisedVersion": "A polished version of the text with your improvements applied.",
  "keyTakeaways": ["Rule 1", "Rule 2"]
}`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Here is the student's writing:\n\n${text}` }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          score: { type: Type.STRING },
          problems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                fix: { type: Type.STRING }
              },
              required: ["type", "description", "examples", "fix"]
            }
          },
          revisedVersion: { type: Type.STRING },
          keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "score", "problems", "revisedVersion", "keyTakeaways"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateExercises = async (problems: any[], grade: string) => {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `You are an ESL tutor. Based on the following writing problems identified for a ${grade} student, generate 3 practice exercises.
Each exercise should target a specific problem type.

Provide the response in JSON format:
{
  "exercises": [
    {
      "title": "Exercise Title",
      "instruction": "What the student should do.",
      "questions": [
        {
          "question": "The sentence to fix or question to answer.",
          "hint": "A small hint.",
          "answer": "The correct answer."
        }
      ]
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Problems identified: ${JSON.stringify(problems)}` }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                instruction: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      hint: { type: Type.STRING },
                      answer: { type: Type.STRING }
                    },
                    required: ["question", "hint", "answer"]
                  }
                }
              },
              required: ["title", "instruction", "questions"]
            }
          }
        },
        required: ["exercises"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
