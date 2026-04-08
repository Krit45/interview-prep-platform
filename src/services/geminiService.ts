import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateQuestions = async (
  role: string,
  type: string,
  difficulty: string,
  resumeText?: string,
  categories?: string[],
  skills?: string[],
  experienceKeywords?: string[]
) => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Generate 5 interview questions for a ${role} position.
    Interview Type: ${type}
    Difficulty: ${difficulty}
    ${categories && categories.length > 0 ? `Focus Categories: ${categories.join(', ')}` : ""}
    ${skills && skills.length > 0 ? `Candidate Skills: ${skills.join(', ')}` : ""}
    ${experienceKeywords && experienceKeywords.length > 0 ? `Experience Keywords: ${experienceKeywords.join(', ')}` : ""}
    ${resumeText ? `Resume Context: ${resumeText}` : ""}
    
    Return the questions in JSON format as an array of objects with "id", "text", and "category" fields.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            category: { type: Type.STRING },
          },
          required: ["id", "text", "category"],
        },
      },
    },
  });

  return JSON.parse(response.text || "[]");
};

export const analyzeResponse = async (
  question: string,
  answer: string,
  role: string,
  type: string
) => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Analyze the following interview response:
    Role: ${role}
    Type: ${type}
    Question: ${question}
    Answer: ${answer}
    
    Provide a score (0-100) and feedback (strengths, weaknesses, improvements).
    Return in JSON format with "score" and "feedback" fields.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
        },
        required: ["score", "feedback"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

export const generateFinalFeedback = async (
  responses: any[],
  role: string,
  type: string
) => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Based on the following interview responses for a ${role} (${type}) position, provide a summary of the candidate's performance.
    
    Responses:
    ${JSON.stringify(responses)}
    
    Provide an overall score (0-100) and detailed feedback (strengths, weaknesses, overall recommendation).
    Return in JSON format with "score" and "feedback" fields.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
        },
        required: ["score", "feedback"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
};

export const parseResume = async (resumeText: string) => {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Extract key professional skills and experience keywords from the following resume text.
    
    Resume Text:
    ${resumeText}
    
    Return the data in JSON format with "skills" (array of strings) and "experienceKeywords" (array of strings) fields.
    Limit to the top 15 most relevant items for each.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          experienceKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["skills", "experienceKeywords"]
      }
    }
  });

  return JSON.parse(response.text || '{"skills": [], "experienceKeywords": []}');
};
