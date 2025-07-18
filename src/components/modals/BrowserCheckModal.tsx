export function BrowserCheckModal() {
  return (
    <div className="browser-check-modal">
      <div className="browser-check-content">
        <div className="browser-check-title">브라우저 지원 안내</div>
        <div className="browser-check-description">
          이 게임은 Chrome 또는 NAVER Whale 브라우저에서만 플레이 가능합니다.
          <br />
          원활한 플레이를 위해 아래 브라우저 중 하나를 이용해주세요.
        </div>
        <div className="browser-links">
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="browser-link"
          >
            Chrome 다운로드
          </a>
          <a
            href="https://whale.naver.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="browser-link"
          >
            Whale 다운로드
          </a>
        </div>
      </div>
    </div>
  );
} 