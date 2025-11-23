import { GoogleGenAI, Type } from "@google/genai";
import { AIPlanResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSchedule = async (userPrompt: string): Promise<AIPlanResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Actúa como un asistente de productividad experto. 
      Genera un plan semanal detallado basado en la solicitud del usuario: "${userPrompt}".
      Distribuye las tareas de manera lógica a través de la semana (Lunes a Domingo).
      Asegúrate de asignar tiempos realistas.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planName: { type: Type.STRING, description: "Un nombre corto y motivador para el plan" },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  day: { 
                    type: Type.STRING, 
                    enum: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] 
                  },
                  startTime: { type: Type.STRING, description: "Formato HH:MM (24h)" },
                  durationMinutes: { type: Type.INTEGER },
                  category: { 
                    type: Type.STRING, 
                    enum: ["work", "personal", "study", "health"] 
                  }
                },
                required: ["title", "day", "startTime", "durationMinutes", "category"]
              }
            }
          },
          required: ["planName", "tasks"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIPlanResponse;
    }
    return null;
  } catch (error) {
    console.error("Error generating schedule:", error);
    throw error;
  }
};