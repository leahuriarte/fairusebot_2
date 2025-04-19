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
    for r in results[:6]:  # Keep the number of results reasonable
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
            Extract the most relevant keywords from this user query to use for a content licensing search. Specifically searching a database for free to use content. If they ask for a copyrighted song, generate keywords to get similar songs in the search.

            Query: "{query}"

            Return ONLY the keywords as a comma-separated list, no explanations.
            """
    response = model.generate_content(prompt)
    return [kw.strip() for kw in response.text.split(",") if kw.strip()]



# Store a single ongoing conversation object
conversation = model.start_chat(history=[
    {"role": "user", "parts": ["You are FairUseBot, an assistant for copyright and ethical content use."]},
])
def get_fair_use_response(query: str) -> str:
    try:
        keywords = extract_keywords_with_gemini(query)
        results = []
        for kw in keywords:
            hits = search_openverse(kw, media_type="audio")
            results.extend(hits)
        results=format_openverse_results(results)


        full_prompt = f"""
                        User asked: {query}

                        Here are some relevant public domain songs based on keywords from their query: {results}

                        Now, generate a legal/ethical answer to their question, considering fair use law and the free-use options above. When you give them the free-use options, provide the artist and link also, leave the HTML so they can play an audio clip from chat <3.
                        """

        response = conversation.send_message(full_prompt)
        print("🔍 Prompt passed to Gemini:\n", full_prompt)
        print("🔍 Keywords searched to Openverse:\n", keywords)
        print("🧠 Bot response:\n", response.text)
        return response.text
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

