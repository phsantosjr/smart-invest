export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponseNo2fa = {
  requires_2fa: false;
  access_token: string;
  token_type: "bearer";
};

export type LoginResponse2fa = {
  requires_2fa: true;
  temp_token: string;
  message: string;
};

export type LoginResponse = LoginResponseNo2fa | LoginResponse2fa;

export type TwoFactorVerifyRequest = {
  temp_token: string;
  code: string;
};

export type TwoFactorVerifyResponse = {
  access_token: string;
  token_type: "bearer";
};