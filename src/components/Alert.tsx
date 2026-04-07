import { AlertDialog } from 'radix-ui';

import styles from './Alert.module.css';

export default function Alert({
  title,
  description,
  confirm,
  cancel,
  open,
  onConfirm,
  onOpenChange,
  variant = 'danger',
}: {
  title: string;
  description: string;
  confirm: string;
  cancel?: string;
  open: boolean;
  onConfirm?: () => void;
  onOpenChange: (open: boolean) => void;
  variant?: 'danger' | 'primary';
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.alertOverlay} />
        <AlertDialog.Content className={styles.alertContent}>
          <AlertDialog.Title className={styles.modalTitle}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={styles.modalDescription}>
            {description}
          </AlertDialog.Description>
          <div className={cancel ? styles.modalActions : ''}>
            {cancel && (
              <AlertDialog.Cancel className='btn-base btn-ghost'>{cancel}</AlertDialog.Cancel>
            )}
            <AlertDialog.Action className={`btn-base btn-${variant}`} onClick={onConfirm}>
              {confirm}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
