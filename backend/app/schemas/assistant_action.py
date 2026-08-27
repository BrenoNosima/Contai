from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AssistantActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    payload: dict[str, Any]
    status: str
    expires_at: datetime

