# CivicIQ — Election Education Assistant

## 🏆 Hackathon Submission

This repository contains the complete codebase for **CivicIQ**, an interactive and easy-to-follow AI assistant that helps users understand election processes, timelines, eligibility, and steps.

### 1. Chosen Vertical
**Civic Technology & Education**
We designed this solution to focus on empowering citizens (first-time voters, newly naturalized citizens, and general public) with politically neutral, accurate, and accessible information about democratic processes.

### 2. Approach and Logic
The core logic of CivicIQ revolves around a secure, streaming AI architecture that strictly prioritizes factual accuracy over general conversation:
- **Political Neutrality Constraint**: The AI is bounded by a rigorous system prompt (see `route.ts`) that prevents any partisan sentiment, candidate endorsement, or political opinion generation.
- **Official Sources Only**: The logic enforces that all claims must be backed by official government data (simulated via RAG pipeline context).
- **Accessibility First**: The application logic includes voice-to-text integration and enforces a Grade 6-8 reading level to ensure the information is understandable to the widest possible audience.
- **Rate Limiting & Safety**: In-memory rate limiting and output sanitization regexes act as a safety net against abuse or prompt injection.

### 3. How the Solution Works
1. **User Interface**: Users visit the platform and can use the interactive CivicBot chat, view the election calendar, or check their eligibility. The frontend is built with React/Next.js and stylized with modern, accessible CSS.
2. **API Layer**: Chat messages are sent to the `/api/v1/ai/chat` Next.js route.
3. **Google Services Integration**: The API communicates securely with **Google Gemini 1.5 Pro** via streaming SSE (Server-Sent Events). The model is instructed using a highly specific system prompt and Harm Category safety settings.
4. **Processing & Streaming**: The response from Gemini is intercepted, sanitized to remove any accidental partisan keywords, and then streamed chunk-by-chunk back to the React frontend.
5. **Dynamic Updates**: The frontend UI updates in real-time, providing an engaging, typing-like experience for the user.

### 4. Assumptions Made
- We assume the user is seeking factual, procedural information about voting (e.g., "Where do I vote?", "What ID do I need?") rather than attempting to generate political opinions.
- We assume modern browser capabilities to support Server-Sent Events (SSE) for streaming the AI responses and standard Web Speech API for voice recognition.
- Currently, the rate limiting is implemented in-memory for the sake of the hackathon demonstration, assuming a single-node deployment (which would be upgraded to Redis in a multi-node production environment).

## 🚀 Evaluation Focus Areas Addressed
- **Code Quality**: Built with Next.js App Router and strict TypeScript typing.
- **Security**: Strict system prompts, output sanitization, and rate limiting implemented.
- **Efficiency**: Streaming SSE ensures fast time-to-first-token, reducing perceived latency.
- **Accessibility**: Includes `aria-live`, `role="log"`, voice input, and screen-reader debounce logic.
- **Google Services**: Deep integration with Google Gemini 1.5 Pro API.
