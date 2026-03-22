from openai import OpenAI
from app.config import settings
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def _parse_json_response(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1:
        cleaned = cleaned[start:end + 1]
    return json.loads(cleaned)


def _json_completion(prompt: str, temperature: float = 0.6, max_tokens: int = 1200) -> dict:
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    content = response.choices[0].message.content.strip()
    return _parse_json_response(content)

def generate_followup(context: str, client_type: str, tone: str) -> dict:
    prompt = f"""
You are an expert sales copywriter who writes highly personalized, detailed follow-up messages.

Here is the sales situation:
Context: {context}
Client Type: {client_type}
Tone: {tone}

Your task is to generate 3 follow-up messages. Be detailed, specific, and personalized based on the context.

Rules:
- Email: Write a FULL email with subject line AND complete email body (at least 150 words).
- WhatsApp: Write a conversational WhatsApp message (3-5 lines). End with a clear call to action.
- Short: Write a powerful one-liner follow-up that creates curiosity or urgency.

Return ONLY this exact JSON format, nothing else:
{{
    "email": "Subject: [subject here]\\n\\n[full email body here with greeting, main content, and sign-off]",
    "whatsapp": "[full whatsapp message here]",
    "short": "[one powerful line here]"
}}
"""
    return _json_completion(prompt, temperature=0.7, max_tokens=1000)


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
    return _json_completion(prompt, temperature=0.7, max_tokens=800)


def score_lead(name: str, company: str, status: str, notes: str) -> dict:
    prompt = f"""
You are an AI lead scoring system. Score this lead based on available information.

Lead Name: {name}
Company: {company or "Unknown"}
Status: {status}
Notes: {notes or "No notes"}

Return ONLY this JSON:
{{
    "score": <number 0-100>,
    "predicted_revenue": <estimated deal value in INR, e.g. 50000>,
    "follow_up_date": "<recommended follow up date e.g. Tomorrow, In 2 days, Next week>",
    "score_reason": "<one line reason for this score>"
}}

Scoring criteria:
- New lead with no notes = 20-30
- Contacted lead = 30-50
- Interested lead with notes = 50-75
- Hot lead ready to close = 75-95
- Converted = 100
- Lost = 5

Return ONLY the JSON.
"""
    return _json_completion(prompt, temperature=0.3, max_tokens=200)


def generate_email_sequence(name: str, company: str, context: str, tone: str) -> dict:
    prompt = f"""
You are an expert sales email copywriter. Create a 7-day email follow-up sequence.

Lead Name: {name}
Company: {company or "their company"}
Context: {context}
Tone: {tone}

Create 7 emails, one per day. Each email should be different — vary the angle, hook, and CTA.

Return ONLY this JSON:
{{
    "sequence": [
        {{
            "day": 1,
            "subject": "email subject",
            "body": "full email body"
        }},
        {{
            "day": 2,
            "subject": "email subject",
            "body": "full email body"
        }},
        {{
            "day": 3,
            "subject": "email subject",
            "body": "full email body"
        }},
        {{
            "day": 4,
            "subject": "email subject",
            "body": "full email body"
        }},
        {{
            "day": 5,
            "subject": "email subject",
            "body": "full email body"
        }},
        {{
            "day": 6,
            "subject": "email subject",
            "body": "full email body"
        }},
        {{
            "day": 7,
            "subject": "email subject",
            "body": "full email body"
        }}
    ]
}}

Make each email unique, valuable and not spammy. Return ONLY the JSON.
"""
    return _json_completion(prompt, temperature=0.7, max_tokens=2000)


def sales_coach_chat(message: str, leads_context: str, chat_history: list) -> str:
    system_prompt = f"""
You are an elite AI Sales Coach with 20 years of experience closing deals.
You are helping a salesperson who has the following leads in their pipeline:

{leads_context}

Your job is to:
- Give specific, actionable sales advice
- Help them close deals faster
- Write messages, emails, scripts on demand
- Analyze their pipeline and suggest priorities
- Coach them on objection handling
- Be direct, confident and results-focused

Always reference their actual leads and pipeline when relevant.
Keep responses concise but powerful. Use emojis sparingly for emphasis.
"""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in chat_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.8,
        max_tokens=600,
    )
    return response.choices[0].message.content.strip()

def analyze_meeting_notes(notes: str, lead_name: str, company: str) -> dict:
    prompt = f"""
You are an expert sales meeting analyst. Analyze these meeting notes and extract structured information.

Lead Name: {lead_name}
Company: {company or "Unknown"}
Meeting Notes: {notes}

Return ONLY this JSON:
{{
    "summary": "<2-3 sentence structured summary of what was discussed>",
    "key_points": ["<point 1>", "<point 2>", "<point 3>"],
    "action_items": ["<action 1>", "<action 2>"],
    "objections": ["<objection raised if any>"],
    "next_steps": "<clear next steps agreed upon>",
    "deal_status": "<your assessment: Positive/Neutral/Negative>",
    "follow_up_email": "Subject: [subject]\\n\\nDear {lead_name},\\n\\n[professional follow-up email body referencing the meeting]\\n\\nBest regards"
}}

Be specific and use actual details from the notes.
Return ONLY the JSON.
"""
    return _json_completion(prompt, temperature=0.5, max_tokens=1000)


def generate_deal_strategy(lead_name: str, company: str, status: str, context: str) -> dict:
    prompt = f"""
You are a world-class revenue strategist helping a seller win a complex deal.

Lead: {lead_name}
Company: {company}
Stage: {status}
Context:
{context}

Return ONLY valid JSON:
{{
  "executive_summary": "<short brutal truth on the deal>",
  "deal_narrative": "<how this deal should be framed strategically>",
  "leverage_points": ["<point 1>", "<point 2>", "<point 3>"],
  "blind_spots": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "likely_objections": ["<objection 1>", "<objection 2>", "<objection 3>"],
  "action_plan": ["<move 1>", "<move 2>", "<move 3>", "<move 4>"]
}}
"""
    return _json_completion(prompt, temperature=0.6, max_tokens=1200)


def generate_objection_playbook(lead_name: str, company: str, objection: str, context: str) -> dict:
    prompt = f"""
You are an elite sales coach. Build a playbook to handle this objection.

Lead: {lead_name}
Company: {company}
Objection: {objection}
Context:
{context}

Return ONLY valid JSON:
{{
  "objection_diagnosis": "<what this objection usually really means here>",
  "root_issue": "<root issue behind the objection>",
  "rebuttal_strategy": "<how to handle it without sounding defensive>",
  "proof_points": ["<proof 1>", "<proof 2>", "<proof 3>"],
  "response_script": "<natural spoken response>",
  "follow_up_message": "<short message to send after the conversation>"
}}
"""
    return _json_completion(prompt, temperature=0.6, max_tokens=900)


def generate_revival_campaign(lead_name: str, company: str, status: str, context: str) -> dict:
    prompt = f"""
You are a top-tier pipeline rescue specialist. This deal has gone quiet.

Lead: {lead_name}
Company: {company}
Stage: {status}
Context:
{context}

Return ONLY valid JSON:
{{
  "diagnosis": "<why the deal likely stalled>",
  "campaign_angle": "<most promising angle to re-open the deal>",
  "sequence": [
    {{
      "step": 1,
      "channel": "<WhatsApp/Email/Call/LinkedIn>",
      "timing": "<when>",
      "message": "<message>",
      "objective": "<goal of this touch>"
    }},
    {{
      "step": 2,
      "channel": "<WhatsApp/Email/Call/LinkedIn>",
      "timing": "<when>",
      "message": "<message>",
      "objective": "<goal of this touch>"
    }},
    {{
      "step": 3,
      "channel": "<WhatsApp/Email/Call/LinkedIn>",
      "timing": "<when>",
      "message": "<message>",
      "objective": "<goal of this touch>"
    }}
  ],
  "do_not_do": ["<mistake 1>", "<mistake 2>", "<mistake 3>"]
}}
"""
    return _json_completion(prompt, temperature=0.65, max_tokens=1400)


def generate_stakeholder_map(lead_name: str, company: str, context: str) -> dict:
    prompt = f"""
You are a deal intelligence analyst. Infer the stakeholder map from the available context.

Lead: {lead_name}
Company: {company}
Context:
{context}

Return ONLY valid JSON:
{{
  "champion": "<likely champion or best guess>",
  "decision_maker": "<likely decision maker or best guess>",
  "economic_buyer": "<likely budget owner or best guess>",
  "blockers": ["<blocker 1>", "<blocker 2>"],
  "missing_people": ["<missing stakeholder 1>", "<missing stakeholder 2>"],
  "access_strategy": ["<move 1>", "<move 2>", "<move 3>"]
}}
"""
    return _json_completion(prompt, temperature=0.4, max_tokens=900)


def generate_meeting_prep(lead_name: str, company: str, status: str, context: str) -> dict:
    prompt = f"""
You are a strategic account executive preparing for a make-or-break meeting.

Lead: {lead_name}
Company: {company}
Stage: {status}
Context:
{context}

Return ONLY valid JSON:
{{
  "meeting_goal": "<single highest-value goal>",
  "agenda": ["<agenda item 1>", "<agenda item 2>", "<agenda item 3>"],
  "strategic_questions": ["<question 1>", "<question 2>", "<question 3>", "<question 4>"],
  "red_flags": ["<red flag 1>", "<red flag 2>", "<red flag 3>"],
  "close_plan": ["<close move 1>", "<close move 2>", "<close move 3>"]
}}
"""
    return _json_completion(prompt, temperature=0.5, max_tokens=1000)
