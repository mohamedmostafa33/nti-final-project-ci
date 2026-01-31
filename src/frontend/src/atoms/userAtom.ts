import { atom } from "recoil";
import { User } from "../types/user";

let userStateKey = "userState";
if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  userStateKey = `userState_${Date.now()}`;
}

export const userState = atom<User | null>({
  key: userStateKey,
  default: null,
});
