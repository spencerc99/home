import React, { useEffect } from "react";

const NewsletterRedirect: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("i");
    const postRedirectLink = slug
      ? `https://spencerchang.substack.com/p/${slug}`
      : null;

    if (postRedirectLink) {
      window.location.replace(postRedirectLink);
    }
  }, []);

  return null;
};

export default NewsletterRedirect;
