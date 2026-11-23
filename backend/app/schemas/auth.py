from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class LoginResponseNo2fa(BaseModel):
    requires_2fa: bool = False
    access_token: str
    token_type: str = "bearer"


class LoginResponse2faRequired(BaseModel):
    requires_2fa: bool = True
    temp_token: str
    message: str = "Insira o código de autenticação de 2 fatores."


LoginResponse = LoginResponseNo2fa | LoginResponse2faRequired


class TwoFactorVerifyRequest(BaseModel):
    temp_token: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class TwoFactorVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ErrorResponse(BaseModel):
    detail: str