// Django User Type
export interface User {
  id: number;
  username: string;
  email: string;
  photoURL?: string | null;
  displayName: string;
  createdAt: string;
}
