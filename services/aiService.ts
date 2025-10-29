import { GoogleGenAI, Type } from '@google/genai';
import { ProceduralParams } from '../types';

const AI_MODEL = 'gemini-2.5-flash';

let ai: GoogleGenAI | null = null;
const getAi = () => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
};


const responseSchema = {
    type: Type.OBJECT,
    properties: {
        baseParams: {
            type: Type.OBJECT,
            properties: {
                octaves: { type: Type.INTEGER, description: "Number of noise layers for detail. Recommended: 4-8." },
                persistence: { type: Type.NUMBER, description: "Amplitude falloff between octaves. Determines roughness. Recommended: 0.4-0.6." },
                lacunarity: { type: Type.NUMBER, description: "Frequency increase between octaves. Determines detail complexity. Recommended: 1.8-2.2." },
                baseFrequency: { type: Type.NUMBER, description: "Initial frequency of the noise. Controls the overall scale of features. Recommended: 0.00002-0.00008." },
                exponent: { type: Type.NUMBER, description: "Exponent applied to the final noise value to shape terrain. >1 creates sharper peaks, <1 creates flatter plains. Recommended: 1.0-2.5." },
                heightScale: { type: Type.NUMBER, description: "Overall vertical scaling factor for the terrain height. Recommended: 30-100." }
            },
            required: ["octaves", "persistence", "lacunarity", "baseFrequency", "exponent", "heightScale"]
        },
        features: {
            type: Type.ARRAY,
            description: "A list of large-scale features to add to the terrain.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, description: "Type of feature. Use 'mountain' for peaks, 'lake' or 'valley' for depressions." },
                    x: { type: Type.NUMBER, description: "Center X position of the feature. Range: -50000 to 50000." },
                    z: { type: Type.NUMBER, description: "Center Z position of the feature. Range: -50000 to 50000." },
                    radius: { type: Type.NUMBER, description: "The radius of the feature's influence. Recommended: 10000-40000." },
                    height: { type: Type.NUMBER, description: "The peak height (positive for mountains) or depth (negative for lakes/valleys). Recommended: 20-150 for mountains, -10 to -80 for lakes." }
                },
                required: ["type", "x", "z", "radius", "height"]
            }
        }
    },
    required: ["baseParams", "features"]
};

export const generateTerrainFromPrompt = async (prompt: string): Promise<ProceduralParams | null> => {
    try {
        const genAI = getAi();
        const fullPrompt = `
            Analyze the user's request for a 3D terrain and generate the parameters for a procedural generator.
            The terrain size is 100,000x100,000 units. The center is at (0,0).
            User request: "${prompt}"
        `;
        
        const response = await genAI.models.generateContent({
            model: AI_MODEL,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const params = JSON.parse(jsonText) as ProceduralParams;
        return params;

    } catch (error) {
        console.error("Error generating terrain from prompt:", error);
        alert("Failed to generate terrain parameters. The AI might be busy, or the request was too complex. Please try a different prompt.");
        return null;
    }
};