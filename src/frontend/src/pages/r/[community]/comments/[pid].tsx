import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useRecoilValue } from "recoil";
import { Post } from "../../../../atoms/postsAtom";
import About from "../../../../components/Community/About";
import PageContentLayout from "../../../../components/Layout/PageContent";
import Comments from "../../../../components/Post/Comments";
import PostLoader from "../../../../components/Post/Loader";
import PostItem from "../../../../components/Post/PostItem";
import useCommunityData from "../../../../hooks/useCommunityData";
import usePosts from "../../../../hooks/usePosts";
import { postsAPI } from "../../../../api/client";
import { userState } from "../../../../atoms/userAtom";

type PostPageProps = {};

const PostPage: React.FC<PostPageProps> = () => {
  const user = useRecoilValue(userState);
  const router = useRouter();
  const { community, pid } = router.query;
  const { communityStateValue } = useCommunityData();

  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    loading,
    setLoading,
    onVote,
  } = usePosts(communityStateValue.currentCommunity);

  const fetchPost = async () => {
    console.log("FETCHING POST");

    setLoading(true);
    try {
      const postData = await postsAPI.getById(parseInt(pid as string));
      
      const post: Post = {
        id: postData.id,
        communityId: postData.communityId, // Updated field name
        creatorId: postData.creatorId?.toString() || "", // Updated field name
        creatorDisplayName: postData.creatorDisplayText || "Unknown", // Updated field name
        userDisplayText: postData.creatorDisplayText || "Unknown", // Updated field name
        title: postData.title,
        body: postData.body || "",
        numberOfComments: postData.numberOfComments || 0, // Updated field name
        voteStatus: postData.voteStatus || 0, // Updated field name
        imageURL: postData.imageURL || "", // Updated field name
        communityImageURL: postData.communityImageURL || "", // Community image from API
        createdAt: new Date(postData.createdAt).getTime(), // Updated field name
      };

      setPostStateValue((prev) => ({
        ...prev,
        selectedPost: post,
      }));
    } catch (error: any) {
      console.log("fetchPost error", error);
    }
    setLoading(false);
  };

  // Fetch post if not in already in state
  useEffect(() => {
    const { pid } = router.query;

    if (pid && !postStateValue.selectedPost) {
      fetchPost();
    }
  }, [router.query, postStateValue.selectedPost]);

  return (
    <PageContentLayout>
      {/* Left Content */}
      <>
        {loading ? (
          <PostLoader />
        ) : (
          <>
            {postStateValue.selectedPost && (
              <>
                <PostItem
                  post={postStateValue.selectedPost}
                  onVote={onVote}
                  onDeletePost={onDeletePost}
                  userVoteValue={
                    postStateValue.postVotes.find(
                      (item) => item.postId === postStateValue.selectedPost!.id
                    )?.voteValue
                  }
                  userIsCreator={
                    user?.id?.toString() === postStateValue.selectedPost.creatorId
                  }
                  router={router}
                />
                <Comments
                  user={user}
                  community={community as string}
                  selectedPost={postStateValue.selectedPost}
                />
              </>
            )}
          </>
        )}
      </>
      {/* Right Content */}
      <>
        <About
          communityData={communityStateValue.currentCommunity}
          loading={loading}
        />
      </>
    </PageContentLayout>
  );
};
export default PostPage;
