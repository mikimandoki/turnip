import { Dialog } from 'radix-ui';
import { useRef, useState } from 'react';

import styles from './Alert.module.css';
import inputStyles from './GroupDialog.module.css';

export default function GroupDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName('');
    onConfirm(trimmed);
  }

  function handleCancel() {
    setName('');
    onCancel();
  }

  return (
    <Dialog.Root open={open} onOpenChange={isOpen => !isOpen && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.alertOverlay} />
        <Dialog.Content
          className={styles.alertContent}
          aria-describedby={undefined}
          onOpenAutoFocus={e => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className={styles.modalTitle}>New group</Dialog.Title>
          <input
            ref={inputRef}
            className={inputStyles.groupNameInput}
            placeholder='Group name'
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <div className={styles.modalActions}>
            <button className='btn-base btn-ghost' onClick={handleCancel}>
              Cancel
            </button>
            <button
              className='btn-base btn-primary'
              onClick={handleConfirm}
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
