import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-2.0-flash")

from fairusebot.cc_lookup import search_openverse

def format_openverse_results(results: list[dict]) -> str:
    if not results:
        return "No free-to-use content was found."

    formatted = "Here are some Creative Commons / public domain options:\n\n"
    for r in results[:5]:  # Keep the number of results reasonable
        formatted += f"""🎵 **{r['title']}**  
            By: {r['creator']}  
            License: [{r['license'].upper()}]({r['license_url']})  
            [Source Page]({r['landing_page']})  
            <audio controls preload="none" style="width: 100%; margin-top: 4px;">
            <source src="{r['url']}" type="audio/mpeg">
            Your browser does not support the audio tag.
            </audio>\n\n"""
    return formatted.strip()

def extract_keywords_with_gemini(query: str) -> list[str]:
    prompt = f"""
        You are a music‑search keyword generator. Given a user’s request, you MUST:

        • **Never** output trademarked or copyrighted titles (e.g. “Pokemon Theme”).  
        • **Only** output 6–10 short keywords (1–2 words each) describing style, mood, instrumentation, or use.  
        • Return a comma‑separated list **only**, no extra text.

        EXAMPLES:
        Input: "Can I use the Pokemon theme song in my school presentation"
        Output: orchestral, upbeat, heroic, fanfare, synth, playful, energetic, cinematic, dynamic, inspirational

        Input: "I need a calm piano background for a cooking video"
        Output: piano, gentle, soft, ambient, background, minimal, relaxed, looping

        Input: "Find spooky music for a Halloween podcast"
        Output: eerie, dark, haunting, ambient, suspenseful, cinematic, ghostly, atmospheric

        Now process this input:

        "{query}"
        """
    response = model.generate_content(prompt)
    return [kw.strip() for kw in response.text.split(",") if kw.strip()]




# Store a single ongoing conversation object
conversation = model.start_chat(history=[
    {"role": "user", "parts": ["You are FairUseBot, an assistant for copyright and ethical content use."]},
])
def get_fair_use_response(query: str, mode: str) -> str:
    try:
        keywords = extract_keywords_with_gemini(query)
        results = []
        for keyword in keywords:
            search_results = search_openverse(keyword, media_type="audio")
            results.extend(search_results)
        results=format_openverse_results(results)


        full_prompt = full_prompt = f"""
            You are FairUseBot, a legal/ethical assistant that gives advice tailored to the user's role. 
            Do not remind the user of your purpose unprompted or unnecessarily repeat information.

            User Mode: {mode.upper()}
            Question: {query}

            If asked to provide these or if it makes sense to do so, here are some public 
            domain / free-use tracks relevant to their question:
            {results}
            If you provide the user with a list of safe content options, do so at the end of your response and keep
            the <audio> tags in place. Also, provide proper citations for any content you suggest the user to use 
            that adheres to the user's provided citation standard OR a citation standard that makes sense if not provided.

            Please respond in a way that is appropriate for a {mode} — tone, explanation depth, 
            and practical advice should reflect their needs. Provide legal insight on whether 
            it qualifies as fair use, AND ethical considerations. If helpful, mention how the user's role affects their rights.

            Avoid excessive indentation and newlines.

            Provide valid citations for any content you suggest and briefly describe its relevant license.
            """
        response = conversation.send_message(
            full_prompt,
            generation_config={
                "max_output_tokens": 1250,
            })
        print("🔍 Keywords searched to Openverse:\n", keywords)
        return response.text
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

