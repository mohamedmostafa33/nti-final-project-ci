import { Button, Flex, Image, Text } from "@chakra-ui/react";
import React from "react";

type OAuthButtonsProps = {};

const OAuthButtons: React.FC<OAuthButtonsProps> = () => {
  // TODO: Implement Google OAuth with Django backend
  const handleGoogleLogin = () => {
    alert("Google OAuth not yet implemented with Django backend");
  };

  return (
    <Flex direction="column" mb={4} width="100%">
      <Button
        variant="oauth"
        mb={2}
        onClick={handleGoogleLogin}
        isDisabled
      >
        <Image src="/images/googlelogo.png" height="20px" mr={4} />
        Continue with Google (Coming Soon)
      </Button>
      <Text textAlign="center" fontSize="9pt" color="gray.500" mt={1}>
        Google OAuth will be added soon
      </Text>
    </Flex>
  );
};
export default OAuthButtons;
