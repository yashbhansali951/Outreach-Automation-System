import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateOptimizedContent(resumeText: string, jobDescription: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert career coach and ATS (Applicant Tracking System) optimizer.
    
    INPUTS:
    1. Original Resume: ${resumeText}
    2. Target Job Description: ${jobDescription}
    
    TASKS:
    1. Optimize the resume for the target job description. Ensure it is ATS-friendly, uses strong action verbs, and highlights relevant skills.
    2. Generate a highly personalized cold email to the hiring team that references specific requirements from the JD and shows how the candidate's background fits.
    
    OUTPUT FORMAT:
    Return a JSON object with exactly two keys:
    "optimizedResume": A string containing the full optimized resume in a clean, professional format.
    "coldEmail": A string containing the cold email, including a subject line at the top.
    
    The resume should follow this structure:
    - Name & Contact Info
    - Professional Summary
    - Experience (Company, Role, Dates, Bullet points)
    - Skills
    - Education
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as { optimizedResume: string; coldEmail: string };
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
