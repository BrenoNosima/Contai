from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.core.password_policy import validate_password_strength

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    password_confirmation: str = Field(min_length=8, max_length=128)

    _strong_password = field_validator("password", "password_confirmation")(validate_password_strength)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        local, separator, domain = value.rpartition("@")
        if (not separator or not local or "." not in domain or domain.startswith(".")
                or domain.endswith(".") or any(char.isspace() for char in value)):
            raise ValueError("Informe um e-mail válido.")
        return value

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.password_confirmation:
            raise ValueError("As senhas não coincidem.")
        return self

class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    _valid_email = field_validator("email")(RegisterRequest.valid_email.__func__)

class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    confirmation: str

    @field_validator("confirmation")
    @classmethod
    def confirms_deletion(cls, value: str) -> str:
        if value != "EXCLUIR MINHA CONTA":
            raise ValueError("Digite EXCLUIR MINHA CONTA para confirmar.")
        return value

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    new_password_confirmation: str = Field(min_length=8, max_length=128)


    _strong_password = field_validator("new_password", "new_password_confirmation")(validate_password_strength)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.new_password_confirmation:
            raise ValueError("As novas senhas não coincidem.")
        if self.current_password == self.new_password:
            raise ValueError("A nova senha deve ser diferente da senha atual.")
        return self

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    must_change_password: bool
    model_config = ConfigDict(from_attributes=True)
