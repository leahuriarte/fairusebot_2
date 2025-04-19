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
    for r in results[:10]:  # Keep the number of results reasonable
        formatted += f"""🎵 **{r['title']}**  
            By: {r['creator']}  
            License: [{r['license'].upper()}]({r['license_url']})  
            [Source Page]({r['landing_page']})  
            <audio controls preload="none" style="width: 100%; margin-top: 4px;">
            <source src="{r['url']}" type="audio/mpeg">
            Your browser does not support the audio tag.
            </audio>\n\n"""
    return formatted.strip()

def is_citation_request(query: str) -> bool:
    keywords = ["cite", "citation", "reference", "mla", "apa", "chicago", "bibliography", "source"]
    return any(kw in query.lower() for kw in keywords)

def load_guide(filename):
    guide_dir = os.path.join(os.path.dirname(__file__), "guides")
    guide_path = os.path.join(guide_dir, filename)
    with open(guide_path, "r", encoding="utf-8") as f:
        return f.read()

def extract_keywords_with_gemini(query: str) -> list[str]:
    prompt = f"""
        You are a music‑search keyword generator. Given a user’s request, you MUST:
  
        • **Only** output a long (10-20) list of short keywords (1–2 words each) describing style, mood, instrumentation, or use.  
        • Return a comma‑separated list **only**, no extra text.

        EXAMPLES:
        Input: "Can I use the Pokemon theme song in my school presentation"
        Output: heroic, fanfare, cinematic, jazz, video game, pokemon, .......

        Input: "I need a calm piano background for a cooking video"
        Output: piano, gentle, soft, ambient, background, minimal, relaxed, calm, .......

        Input: "Find spooky music for a Halloween podcast"
        Output: eerie, dark, haunting, ambient, suspenseful, cinematic, ghostly, atmospheric, halloween, ........

        NEVER use terminology that can be broadly applied to any genre such as "upbeat" or energetic" or terms unless 
        specifcally asked. 

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
        for kw in keywords:
            hits = search_openverse(kw, media_type="audio")
            results.extend(hits)
        results=format_openverse_results(results)

        citation_text = ""
        if is_citation_request(query):
            if "mla" in query.lower():
                citation_text = load_guide("mla.md")
            elif "apa" in query.lower():
                citation_text = load_guide("apa.md")
            elif "chicago" in query.lower():
                citation_text = load_guide("chicago.md")
            else:
                citation_text = (
                    load_guide("mla.md") + "\n\n" +
                    load_guide("apa.md") + "\n\n" +
                    load_guide("chicago.md")
                )


        full_prompt = full_prompt = f"""
            You are FairUseBot, a legal/ethical assistant that gives advice tailored to the user's role.

            👤 User Mode: {mode.upper()}
            📥 Question: {query}

            🎧 Here are some public domain / free-use tracks relevant to their question. Do not give them all the results, only the 3-7 tracks you think are most relevant to their query.  HOWEVER, if the user is not requesting music/audio or there are no relevant results in the following, then DO NOT give them a list of tracks, just ignore the following list. 
            {results}

            Please respond in a way that is appropriate for a {mode} — tone, explanation depth, and practical advice should reflect their needs. Provide legal insight on whether it qualifies as fair use, AND ethical considerations. If helpful, mention how the user's role affects their rights.

            {f'Here are relevant citation rules:\n{citation_text}' if citation_text else ''}

            End with the list of safe content options, keeping the <audio> tags in place.
            """
        response = conversation.send_message(full_prompt)
        print("🔍 Keywords searched to Openverse:\n", keywords)
        return response.text
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

