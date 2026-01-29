import React from "react";
import { Flex, Image } from "@chakra-ui/react";
import { useSetRecoilState } from "recoil";
import {
  defaultMenuItem,
  directoryMenuState,
} from "../../atoms/directoryMenuAtom";
import { useAuthState } from "../../hooks/useAuthCompat";
import Directory from "./Directory";
import RightContent from "./RightContent";
import SearchInput from "./SearchInput";
import router from "next/router";
import useDirectory from "../../hooks/useDirectory";
import { User } from "../../types/user";

const Navbar: React.FC = () => {
  const [user] = useAuthState();

  // Use <Link> for initial build; implement directory logic near end
  const { onSelectMenuItem } = useDirectory();

  return (
    <Flex
      bg="white"
      height="44px"
      padding="6px 12px"
      justifyContent={{ md: "space-between" }}
    >
      <Flex
        align="center"
        width={{ base: "40px", md: "auto" }}
        mr={{ base: 0, md: 2 }}
        cursor="pointer"
        onClick={() => onSelectMenuItem(defaultMenuItem)}
      >
        <Image src="/images/redditFace.svg" height="30px" />
        <Image
          display={{ base: "none", md: "unset" }}
          src="/images/redditText.svg"
          height="46px"
        />
      </Flex>
      {user && <Directory />}
      <SearchInput user={user || undefined} />
      <RightContent user={user || undefined} />
    </Flex>
  );
};
export default Navbar;
