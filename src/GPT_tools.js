import { GoogleGenAI } from "@google/genai";
import {fileToBase64,saveBase64Image} from "./fileSystemUtils";

export const GPT = {
    async txt2txt(input,system_msg = "You are a helpful assistant.", images = [],schema = null) {
        try {
            const messages = [
                { role: "system", content: system_msg }
            ];

            // First add the user's text message (if provided)
            if (input) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: input }
                    ]
                });
            }

            // Then add each image as its own user message
            for (const image of images) {
                const { dataUrl } = await fileToBase64(image.handle);

                messages.push({
                    role: "user",
                    content: [
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                });
            }

            const payload = {
                model: window.projinfo.gpt_model,
                messages
            };

            if (schema && schema.response_format) {
                payload.response_format = schema.response_format;
            }

            const options = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${window.userdata.GPT_API_KEY}`
                },
                body: JSON.stringify(payload)
            };

            console.log("payload",payload);
            console.log("OPTIONS",options);
            const res = await fetch("https://api.openai.com/v1/chat/completions", options);

            const data = await res.json();
            console.log("OpenAI response:", data);
            return data.choices[0].message.content;

        } catch (err) {
            console.error(err);
            return "Error: " + err.message;
        }
    },

    schemas : {
        shots_schema:{
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "video_shots",
                    strict: true,
                    schema: {
                    type: "object",
                    patternProperties: {
                        "^SHOT_[0-9]{3}$": {
                        type: "object",
                        properties: {
                            prompt: {
                            type: "string",
                            minLength: 1
                            },
                            camera: {
                            type: "string",
                            minLength: 1
                            },
                            action_description: {
                            type: "string",
                            minLength: 1
                            }
                        },
                        required: ["prompt", "camera", "action_description"],
                        additionalProperties: false
                        }
                    },
                    additionalProperties: false,
                    minProperties: 1
                    }
                }
            }
        }
    }


}

export const OpenRouter = {
    async txt2txt(input) {

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${window.userdata.openrouter_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "openai/gpt-oss-20b:free",
                "messages": [
                {
                    "role": "user",
                    "content": input
                }
                ],
                "reasoning": {"enabled": true}
                })
            });

        const result = await response.json();
        message = result.choices[0].message;
        console.log(message);
        console.log(message.content);
        return message.content;
    }

}

export const GGAI = {
    init() { 
        if (this.ai  == null) 
        this.ai = new GoogleGenAI({apiKey:window.userdata.Google_API_KEY});
    },

    async img2img(prompt,handle,images) {
        this.init();

        //Simple Text
        /*
        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Explain how AI works in a few words",
        });
        console.log("GOOGLE RESPONSE",response.text);
        */
       
        // Generate Image
        /*
        const payload = {
            model: "gemini-2.5-flash-image",
            contents: prompt,
        }
        console.log("Gemini Payload",payload);
        */


        // Img 2 Img
        const contents = [];
        contents.push({ text: prompt });

        console.log("images")
        // Add all images
        for (const img of images) {
            if (!img || !img.rawBase64 || !img.mime) continue;
            contents.push({
                inlineData: { data: img.rawBase64, mimeType: img.mime }
            });
        }

        const payload = {
            model: "gemini-2.5-flash-image",
            contents,
            config: {
                imageConfig: {
                    aspectRatio: "9:16",
                    //imageSize: "1K",
            },
    },
        };
        console.log("Gemini Payload",payload);

        const response = await this.ai.models.generateContent(payload);
        console.log("GEMINI RES",response);

        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                console.log(part.text);
            } 
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                const base64 = part.inlineData.data; 
                await saveBase64Image(base64, `${response.responseId}.png`, handle);
                console.log("SAVED IMAGE");                
            }
        }        
    }




}