import { atom } from "recoil";

export interface AuthModalState {
  open: boolean;
  view: ModalView;
}

export type ModalView = "login" | "signup";

const defaultModalState: AuthModalState = {
  open: false,
  view: "login",
};

let authModalStateKey = "authModalState";
if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  authModalStateKey = `authModalState_${Date.now()}`;
}

export const authModalState = atom<AuthModalState>({
  key: authModalStateKey,
  default: defaultModalState,
});
