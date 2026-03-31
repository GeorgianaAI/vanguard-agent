export type OperatorRole = "admin" | "analyst" | "viewer";

export type SessionClaims = {
  sub: string; // username
  role: OperatorRole;
  iat: number;
  exp: number;
};

export type OperatorRecord = {
  username: string;
  password: string;
  role: OperatorRole;
};
