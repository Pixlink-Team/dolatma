import type { SocialMediaPost } from "@/lib/types";

export function isSitePublication(post: Pick<SocialMediaPost, "platform">): boolean {
  return post.platform === "site";
}

export function splitSocialPosts(posts: SocialMediaPost[]) {
  const sitePublications = posts.filter(isSitePublication);
  const socialPosts = posts.filter((post) => !isSitePublication(post));
  return { sitePublications, socialPosts };
}
