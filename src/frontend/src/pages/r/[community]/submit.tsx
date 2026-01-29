import { Box, Text } from "@chakra-ui/react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useRecoilValue } from "recoil";
import { communityState } from "../../../atoms/communitiesAtom";
import About from "../../../components/Community/About";
import PageContentLayout from "../../../components/Layout/PageContent";
import NewPostForm from "../../../components/Post/PostForm/NewPostForm";
import useCommunityData from "../../../hooks/useCommunityData";
import { userState } from "../../../atoms/userAtom";

const CreateCommmunityPostPage: NextPage = () => {
  const user = useRecoilValue(userState);
  const router = useRouter();
  const { community } = router.query;
  const communityStateValue = useRecoilValue(communityState);
  const { loading } = useCommunityData();

  /**
   * Redirect user if not authenticated
   */
  useEffect(() => {
    if (!user && communityStateValue.currentCommunity.id) {
      router.push(`/r/${communityStateValue.currentCommunity.id}`);
    }
  }, [user, communityStateValue.currentCommunity]);

  return (
    <PageContentLayout maxWidth="1060px">
      <>
        <Box p="14px 0px" borderBottom="1px solid" borderColor="white">
          <Text fontWeight={600}>Create a post</Text>
        </Box>
        {user && (
          <NewPostForm
            communityId={communityStateValue.currentCommunity.id}
            communityImageURL={communityStateValue.currentCommunity.imageURL}
            user={user}
          />
        )}
      </>
      {communityStateValue.currentCommunity && (
        <>
          <About
            communityData={communityStateValue.currentCommunity}
            pt={6}
            onCreatePage
            loading={loading}
          />
        </>
      )}
    </PageContentLayout>
  );
};

export default CreateCommmunityPostPage;
