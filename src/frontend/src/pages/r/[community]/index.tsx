import { useEffect } from "react";
import type { GetServerSidePropsContext, NextPage } from "next";
import { useRecoilState, useRecoilValue } from "recoil";
import { Community, communityState } from "../../../atoms/communitiesAtom";
import About from "../../../components/Community/About";
import CommunityNotFound from "../../../components/Community/CommunityNotFound";
import CreatePostLink from "../../../components/Community/CreatePostLink";
import Header from "../../../components/Community/Header";
import PageContentLayout from "../../../components/Layout/PageContent";
import Posts from "../../../components/Post/Posts";
import { userState } from "../../../atoms/userAtom";
import axios from "axios";

interface CommunityPageProps {
  communityData: Community | null;
}

const CommunityPage: NextPage<CommunityPageProps> = ({ communityData }) => {
  const user = useRecoilValue(userState);
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);

  useEffect(() => {
    if (communityData) {
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: communityData,
      }));
    }
  }, [communityData]);

  // Community was not found in the database
  if (!communityData) {
    return <CommunityNotFound />;
  }

  return (
    <>
      <Header communityData={communityData} />
      <PageContentLayout>
        {/* Left Content */}
        <>
          <CreatePostLink />
          <Posts
            communityData={communityData}
            userId={user?.id?.toString()}
            loadingUser={false}
          />
        </>
        {/* Right Content */}
        <>
          <About communityData={communityData} />
        </>
      </PageContentLayout>
    </>
  );
};

export default CommunityPage;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  console.log("GET SERVER SIDE PROPS RUNNING");

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const communityId = context.query.community as string;
    
    // Fetch community from Django API
    const response = await axios.get(`${apiUrl}/communities/${communityId}/`);
    
    const communityData: Community = {
      id: response.data.id,
      creatorId: response.data.creatorId?.toString() || "",
      numberOfMembers: response.data.numberOfMembers || 0,
      privacyType: response.data.privacyType || "public",
      createdAt: response.data.createdAt,
      imageURL: response.data.imageURL || "",
    };

    return {
      props: {
        communityData,
      },
    };
  } catch (error: any) {
    console.log("getServerSideProps error - [community]", error.response?.data || error.message);
    
    // If community not found, return null
    if (error.response?.status === 404) {
      return {
        props: {
          communityData: null,
        },
      };
    }
    
    // For other errors, also return null
    return {
      props: {
        communityData: null,
      },
    };
  }
}
