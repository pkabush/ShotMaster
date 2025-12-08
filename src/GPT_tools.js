const GPT = {
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

const OpenRouter = {
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

