import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import {
  Community,
  CommunitySnippet,
  communityState,
  defaultCommunity,
} from "../atoms/communitiesAtom";
import { communitiesAPI } from "../api/client";
import { userState } from "../atoms/userAtom";

const useCommunityData = (ssrCommunityData?: boolean) => {
  const user = useRecoilValue(userState);
  const router = useRouter();
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(communityState);
  const setAuthModalState = useSetRecoilState(authModalState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !!communityStateValue.mySnippets.length) return;
    getSnippets();
  }, [user]);

  const getSnippets = async () => {
    setLoading(true);
    try {
      // Fetch user's communities via Django API
      const communities = await communitiesAPI.getUserCommunities();
      
      const snippets: CommunitySnippet[] = communities.map((comm: any) => ({
        communityId: comm.communityId,
        imageURL: comm.imageURL || "",
        isModerator: comm.isModerator || false,
      }));

      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: snippets,
        initSnippetsFetched: true,
      }));
    } catch (error: any) {
      console.log("Error getting user snippets", error);
      setError(error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const getCommunityData = async (communityId: string) => {
    console.log("GETTING COMMUNITY DATA");

    try {
      // Fetch community details from Django API
      const communityData = await communitiesAPI.getById(communityId);
      
      const community: Community = {
        id: communityData.id,
        creatorId: communityData.creatorId?.toString() || "",
        numberOfMembers: communityData.numberOfMembers || 0,
        privacyType: communityData.privacyType || "public",
        createdAt: communityData.createdAt,
        imageURL: communityData.imageURL || "",
      };

      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: community,
      }));
    } catch (error: any) {
      console.log("getCommunityData error", error);
      setError(error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const onJoinLeaveCommunity = (community: Community, isJoined?: boolean) => {
    console.log("ON JOIN LEAVE", community.id);

    if (!user) {
      setAuthModalState({ open: true, view: "login" });
      return;
    }

    setLoading(true);
    if (isJoined) {
      leaveCommunity(community.id);
      return;
    }
    joinCommunity(community);
  };

  const joinCommunity = async (community: Community) => {
    console.log("JOINING COMMUNITY: ", community.id);
    try {
      // Call Django API to join community
      await communitiesAPI.join(community.id);

      const newSnippet: CommunitySnippet = {
        communityId: community.id,
        imageURL: community.imageURL || "",
        isModerator: false,
      };

      // Update state
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: [...prev.mySnippets, newSnippet],
        currentCommunity: {
          ...prev.currentCommunity,
          numberOfMembers: prev.currentCommunity.numberOfMembers + 1,
        },
      }));
    } catch (error: any) {
      console.log("joinCommunity error", error);
      setError(error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  const leaveCommunity = async (communityId: string) => {
    try {
      // Call Django API to leave community
      await communitiesAPI.leave(communityId);

      // Update state
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: prev.mySnippets.filter(
          (item) => item.communityId !== communityId
        ),
        currentCommunity: {
          ...prev.currentCommunity,
          numberOfMembers: Math.max(0, prev.currentCommunity.numberOfMembers - 1),
        },
      }));
    } catch (error: any) {
      console.log("leaveCommunity error", error);
      setError(error.response?.data?.detail || error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const { community } = router.query;
    if (community) {
      const communityData = communityStateValue.currentCommunity;

      if (!communityData.id) {
        getCommunityData(community as string);
        return;
      }
    } else {
      // Reset to default when not viewing a community
      setCommunityStateValue((prev) => ({
        ...prev,
        currentCommunity: defaultCommunity,
      }));
    }
  }, [router.query, communityStateValue.currentCommunity]);

  return {
    communityStateValue,
    onJoinLeaveCommunity,
    loading,
    setLoading,
    error,
  };
};

export default useCommunityData;
