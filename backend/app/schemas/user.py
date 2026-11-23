from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    household_id: UUID | None
    name: str
    email: EmailStr
    is_household_owner: bool
    is_2fa_enabled: bool