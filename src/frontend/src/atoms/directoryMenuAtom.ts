import { atom } from "recoil";
import { IconType } from "react-icons";
import { TiHome } from "react-icons/ti";

export type DirectoryMenuItem = {
  displayText: string;
  link: string;
  icon: IconType;
  iconColor: string;
  imageURL?: string;
};

interface DirectoryMenuState {
  isOpen: boolean;
  selectedMenuItem: DirectoryMenuItem;
}

export const defaultMenuItem = {
  displayText: "Home",
  link: "/",
  icon: TiHome,
  iconColor: "black",
};

export const defaultMenuState: DirectoryMenuState = {
  isOpen: false,
  selectedMenuItem: defaultMenuItem,
};

let directoryMenuStateKey = "directoryMenuState";
if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  directoryMenuStateKey = `directoryMenuState_${Date.now()}`;
}

export const directoryMenuState = atom({
  key: directoryMenuStateKey,
  default: defaultMenuState,
});
