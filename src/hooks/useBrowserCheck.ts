import { useEffect, useState } from 'react';

export function useBrowserCheck() {
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent);
    const isWhale = /whale/.test(userAgent);
    
    setIsSupportedBrowser(isChrome || isWhale);
  }, []);

  return isSupportedBrowser;
} 