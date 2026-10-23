export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
}