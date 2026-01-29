import React from "react";
import { Flex } from "@chakra-ui/react";
import AuthModal from "../../Modal/Auth";
import AuthButtons from "./AuthButtons";
import Icons from "./Icons";
import MenuWrapper from "./ProfileMenu/MenuWrapper";
import { User } from "../../../types/user";

type RightContentProps = {
  user?: User;
};

const RightContent: React.FC<RightContentProps> = ({ user }) => {
  return (
    <>
      <AuthModal />
      <Flex justifyContent="space-between" alignItems="center">
        {user ? <Icons /> : <AuthButtons />}
        <MenuWrapper />
      </Flex>
    </>
  );
};
export default RightContent;
