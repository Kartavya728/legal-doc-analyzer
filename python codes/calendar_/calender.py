import json
from datetime import datetime, timedelta, date
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from utils import call_gemini
import re

SCOPES = ['https://www.googleapis.com/auth/calendar']


def generate_event_summary(context_sentence):
    """Use Gemini to create a concise summary for a calendar event."""
    prompt = f"""
    Based on the following sentence from a legal document, create a short and relevant calendar event title.
    The title should be a concise summary of the main action.
    Do not include the date in the title.
    Return only the title as a single line of plain text.
    For example:
    - Input: "The accused has been summoned to appear before the Court on 20/09/2025."
    - Output: "Court Appearance for Accused"
    - Input: "Further statements of witnesses are scheduled to be recorded on 25/09/2025."
    - Output: "Futher Recording Witness Statements in the court"

    Sentence:
    "{context_sentence}"
    """
    summary = call_gemini(prompt).strip()
    return summary if summary else "Legal Deadline"


def extract_future_dates_with_context(doc_text):
    """Extract future dates and context using Gemini instead of dateparser."""

    today = datetime.now().date()

    prompt = f"""
    Extract all dates mentioned in the text below.
    - Return only dates that are strictly in the future (after today: {today}).
    - Format each date in ISO format (YYYY-MM-DD).
    - For each date, also return the exact sentence context.
    - Output strictly as a JSON list of objects with keys "date" and "context".

    Text:
    {doc_text}
    """

    response_text = call_gemini(prompt).strip()

    if not response_text:
        print("Gemini returned an empty response.")
        return []
    try:
        results = json.loads(response_text)
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", response_text, re.DOTALL)
        if match:
            try:
                results = json.loads(match.group())
            except json.JSONDecodeError:
                print("Still invalid after extraction.")
                return []
        else:
            return []

    if not isinstance(results, list):
        print("Gemini returned something unexpected, forcing empty list.")
        return []

    return results


def save_dates_to_json(results, filename="dates.json"):
    """Save extracted dates to JSON file."""
    with open(filename, "w") as f:
        json.dump(results, f, indent=4)
    return filename

# json content = {"installed":{"client_id":"xxxx","project_id":"sustained-works-470816-b6","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://link","client_secret":"key","redirect_uris":["http://localhost"]}}

def get_calendar_service():
    """Authenticate and return Google Calendar API service."""
    flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
    creds = flow.run_local_server(port=0)
    service = build("calendar", "v3", credentials=creds)
    return service


def load_dates_from_json(filename="dates.json"):
    """Load saved events JSON."""
    with open(filename, "r") as f:
        return json.load(f)


def add_events_to_calendar(events, calendar_id="primary"):
    """Insert extracted events into Google Calendar as all-day events."""
    service = get_calendar_service()

    for event in events:
        # Generate a concise summary for the event title
        summary = generate_event_summary(event["context"])
        start_date = date.fromisoformat(event["date"])
        end_date = start_date + timedelta(days=1)

        event_body = {
            "summary": summary,  
            "description": event["context"], 
            "start": {
                "date": start_date.isoformat(),
                "timeZone": "Asia/Kolkata"
            },
            "end": {
                "date": end_date.isoformat(),
                "timeZone": "Asia/Kolkata"
            }
        }

        created_event = service.events().insert(
            calendarId=calendar_id, body=event_body
        ).execute()
