import { useEffect, useState } from "react";

export function useBrowserCheck() {
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();

    // 모바일 체크
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

    // 브라우저 체크
    const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent);
    const isWhale = /whale/.test(userAgent);

    setIsSupportedBrowser((isChrome || isWhale) && !isMobile);
  }, []);

  return isSupportedBrowser;
}
