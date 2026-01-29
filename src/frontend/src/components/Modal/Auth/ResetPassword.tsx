import React, { useState } from "react";
import { Button, Flex, Icon, Input, Text } from "@chakra-ui/react";
import { BsDot, BsReddit } from "react-icons/bs";
import { authModalState, ModalView } from "../../../atoms/authModalAtom";
import { useSetRecoilState } from "recoil";
import { authAPI } from "../../../api/client";

type ResetPasswordProps = {
  toggleView: (view: ModalView) => void;
};

const ResetPassword: React.FC<ResetPasswordProps> = ({ toggleView }) => {
  const setAuthModalState = useSetRecoilState(authModalState);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    
    setSending(true);
    setError("");
    
    try {
      const response = await authAPI.passwordResetRequest(email);
      console.log("Password Reset Response:", response);
      console.log("Reset URL (Development):", response.reset_url);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send reset email. Please try again.");
    } finally {
      setSending(false);
    }
  };
  
  return (
    <Flex direction="column" alignItems="center" width="100%">
      <Icon as={BsReddit} color="brand.100" fontSize={40} mb={2} />
      <Text fontWeight={700} mb={2}>
        Reset your password
      </Text>
      {success ? (
        <Flex direction="column" alignItems="center" width="100%">
          <Text mb={2} color="green.500" fontWeight={600}>
            Password reset link sent!
          </Text>
          <Text fontSize="sm" textAlign="center" mb={4}>
            Check your email for the reset link. 
            (In development mode, check the browser console for the link)
          </Text>
          <Button
            width="100%"
            onClick={() => toggleView("login")}
          >
            Back to Login
          </Button>
        </Flex>
      ) : (
        <>
          <Text fontSize="sm" textAlign="center" mb={2}>
            Enter the email associated with your account and we will send you a
            reset link
          </Text>
          <form onSubmit={onSubmit} style={{ width: "100%" }}>
            <Input
              required
              name="email"
              placeholder="email"
              type="email"
              mb={2}
              onChange={(event) => setEmail(event.target.value)}
              fontSize="10pt"
              _placeholder={{ color: "gray.500" }}
              _hover={{
                bg: "white",
                border: "1px solid",
                borderColor: "blue.500",
              }}
              _focus={{
                outline: "none",
                bg: "white",
                border: "1px solid",
                borderColor: "blue.500",
              }}
              bg="gray.50"
            />
            <Text textAlign="center" fontSize="10pt" color="red">
              {error}
            </Text>
            <Button
              width="100%"
              height="36px"
              mb={2}
              mt={2}
              type="submit"
              isLoading={sending}
            >
              Reset Password
            </Button>
          </form>
        </>
      )}
      <Flex
        alignItems="center"
        fontSize="9pt"
        color="blue.500"
        fontWeight={700}
        cursor="pointer"
      >
        <Text
          onClick={() =>
            setAuthModalState((prev) => ({
              ...prev,
              view: "login",
            }))
          }
        >
          LOGIN
        </Text>
        <Icon as={BsDot} />
        <Text
          onClick={() =>
            setAuthModalState((prev) => ({
              ...prev,
              view: "signup",
            }))
          }
        >
          SIGN UP
        </Text>
      </Flex>
    </Flex>
  );
};
export default ResetPassword;
