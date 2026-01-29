import React, { useState } from "react";
import { Button, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { FaReddit } from "react-icons/fa";
import { useRouter } from "next/router";
import { useSetRecoilState, useRecoilValue } from "recoil";
import { authModalState } from "../../atoms/authModalAtom";
import { userState } from "../../atoms/userAtom";
import { communityState } from "../../atoms/communitiesAtom";
import CreateCommunityModal from "../Modal/CreateCommunity";

const PersonalHome: React.FC = () => {
  const router = useRouter();
  const user = useRecoilValue(userState);
  const { mySnippets } = useRecoilValue(communityState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false);

  const handleCreatePost = () => {
    // Check if user is logged in
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }
    
    // If user has joined communities, redirect to first one's submit page
    if (mySnippets.length > 0) {
      router.push(`/r/${mySnippets[0].communityId}/submit`);
    } else {
      // User hasn't joined any communities yet
      alert("Please join or create a community first before creating a post!");
    }
  };

  const handleCreateCommunity = () => {
    // Check if user is logged in
    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }
    // Open create community modal
    setCreateCommunityOpen(true);
  };

  return (
    <>
      <CreateCommunityModal
        isOpen={createCommunityOpen}
        handleClose={() => setCreateCommunityOpen(false)}
        userId={user?.id?.toString() || ""}
      />
      <Flex
        direction="column"
        bg="white"
        borderRadius={4}
        cursor="pointer"
        border="1px solid"
        borderColor="gray.300"
        position="sticky"
      >
        <Flex
          align="flex-end"
          color="white"
          p="6px 10px"
          bg="blue.500"
          height="34px"
          borderRadius="4px 4px 0px 0px"
          fontWeight={600}
          bgImage="url(/images/redditPersonalHome.png)"
          backgroundSize="cover"
        ></Flex>
        <Flex direction="column" p="12px">
          <Flex align="center" mb={2}>
            <Icon as={FaReddit} fontSize={50} color="brand.100" mr={2} />
            <Text fontWeight={600}>Home</Text>
          </Flex>
          <Stack spacing={3}>
            <Text fontSize="9pt">
              Your personal Reddit frontpage, built for you.
            </Text>
            <Button height="30px" onClick={handleCreatePost}>Create Post</Button>
            <Button variant="outline" height="30px" onClick={handleCreateCommunity}>
              Create Community
            </Button>
          </Stack>
        </Flex>
      </Flex>
    </>
  );
};
export default PersonalHome;
