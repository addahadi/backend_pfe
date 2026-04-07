const Groq = require("groq-sdk");

// Initialize Groq with your API Key
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const getExpertResponse = async (userMessage) => {
    try {
        // Use Groq's mixtral model
        const message = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an Algerian civil engineer and construction expert. 
Your job is to help the user with construction calculations, standard door/window sizes in Algeria, and cement mixing ratios.
Strict Rule: If the user asks about anything outside of construction, civil engineering, or architecture (like cooking, politics, etc.), you must apologize and say: "I am a virtual construction engineer and I only answer questions related to construction and building materials."`,
                },
                {
                    role: "user",
                    content: userMessage,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });

        return message.choices[0].message.content;
    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error("Failed to generate AI response.");
    }
};

module.exports = { getExpertResponse };