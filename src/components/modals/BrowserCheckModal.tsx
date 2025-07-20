import s from './browserCheckModal.module.scss';

export function BrowserCheckModal() {
  return (
    <div className={s.browserCheckModal}>
      <div className={s.content}>
        <div className={s.title}>지원 환경 안내</div>
        <div className={s.description}>
          이 게임은 PC의 Chrome 또는 NAVER Whale 브라우저에서만 플레이 가능합니다.
          <br />
          모바일 환경에서는 플레이할 수 없습니다.
          <br />
          <br />
          원활한 플레이를 위해 PC에서 아래 브라우저 중 하나를 이용해주세요.
        </div>
        <div className={s.browserLinks}>
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className={s.browserLink}
          >
            Chrome 다운로드
          </a>
          <a
            href="https://whale.naver.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={s.browserLink}
          >
            Whale 다운로드
          </a>
        </div>
      </div>
    </div>
  );
} 