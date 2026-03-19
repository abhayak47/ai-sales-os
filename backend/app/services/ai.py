from openai import OpenAI
from app.config import settings
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def generate_followup(context: str, client_type: str, tone: str) -> dict:
    prompt = f"""
You are an expert sales copywriter who writes highly personalized, detailed follow-up messages.

Here is the sales situation:
Context: {context}
Client Type: {client_type}
Tone: {tone}

Your task is to generate 3 follow-up messages. Be detailed, specific, and personalized based on the context.

Rules:
- Email: Write a FULL email with subject line AND complete email body (at least 150 words). Be warm, reference specific details from the context.
- WhatsApp: Write a conversational WhatsApp message (3-5 lines). Reference specific details. End with a clear call to action.
- Short: Write a powerful one-liner follow-up that creates curiosity or urgency.

Return ONLY this exact JSON format, nothing else:
{{
    "email": "Subject: [subject here]\\n\\n[full email body here with greeting, main content, and sign-off]",
    "whatsapp": "[full whatsapp message here]",
    "short": "[one powerful line here]"
}}
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1000,
    )
    content = response.choices[0].message.content.strip()
    return json.loads(content)


def analyze_lead(name: str, company: str, status: str, notes: str) -> dict:
    prompt = f"""
You are an expert sales coach and deal analyzer with 20 years of experience.

Analyze this sales lead and provide intelligent insights:

Lead Name: {name}
Company: {company}
Current Status: {status}
Notes/History: {notes if notes else "No notes yet"}

Provide a detailed analysis in this EXACT JSON format:
{{
    "deal_score": <number between 1-10>,
    "win_probability": <number between 0-100>,
    "deal_temperature": "<Cold/Warm/Hot>",
    "next_action": "<specific action to take right now>",
    "next_action_timing": "<when to do it, e.g. Today, Tomorrow, This week>",
    "risk_factors": "<what could kill this deal>",
    "opportunity": "<what's the biggest opportunity here>",
    "suggested_message": "<a short ready-to-send message for next touchpoint>",
    "coach_advice": "<2-3 sentences of personalized sales coaching advice>"
}}

Be specific, actionable and brutally honest. Base everything on the notes provided.
Return ONLY the JSON, nothing else.
"""
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=800,
    )
    content = response.choices[0].message.content.strip()
    return json.loads(content)