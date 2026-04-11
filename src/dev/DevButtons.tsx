import { debugNotifs } from './debug';
import styles from './DevButtons.module.css';

export default function DevButtons({ onClearAll }: { onClearAll: () => void }) {
  return (
    <div className='btn-row'>
      <button className={styles.btn} onClick={onClearAll} data-testid='dev-delete-all'>
        Delete All
      </button>
      <button className={styles.btn} onClick={() => void debugNotifs()}>
        Debug Notifs
      </button>
    </div>
  );
}
