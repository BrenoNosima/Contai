from fastapi import APIRouter

from app.core.config import SETTINGS

router = APIRouter(prefix="/privacy", tags=["Privacy"])

@router.get("")
def privacy_information():
    return {
        "controller": SETTINGS.privacy_controller_name,
        "contact": SETTINGS.privacy_contact_email,
        "country": SETTINGS.privacy_country,
        "ai_provider": "Groq",
        "ai_destination": "Estados Unidos",
        "policy_version": "2026-09-03",
    }
