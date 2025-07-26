import s from "./howToPlayModal.module.scss";

interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={s.title}>게임 플레이 방법</h2>
        <div className={s.content}>
          키보드의 <strong>D, F, J, K</strong> 키를 사용하여 플레이합니다.
          <br />
          <br />
          화면에 표시되는 레일에 맞춰 노트가 판정선에 도달할 때 해당하는 키를
          누르세요!
        </div>
        <button className={s.closeButton} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
