import { Dialog } from 'radix-ui';
import { useRef, useState } from 'react';

import { useHabitContext } from '../contexts/useHabitContext';
import { exportData } from '../utils/localStorage';

export default function SettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { habits, applyImport } = useHabitContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ message: string; ok: boolean } | null>(null);

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const json = ev.target?.result as string;
      void applyImport(json).then(result => {
        setStatus(
          result.success
            ? { message: 'Import successful.', ok: true }
            : { message: result.error ?? 'Import failed.', ok: false }
        );
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={next => {
        if (!next) setStatus(null);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='modal-overlay' />
        <Dialog.Content className='modal-content'>
          <Dialog.Title className='modal-title'>Settings</Dialog.Title>
          <div className='settings-section'>
            <div className='settings-label'>Export</div>
            <button
              className='btn-cancel'
              onClick={() => {
                void exportData().then(result => {
                  if (result.error) setStatus({ message: result.error, ok: false });
                });
              }}
            >
              Download backup
            </button>
          </div>
          <div className='settings-section'>
            <div className='settings-label'>Import</div>
            {habits.length > 0 && (
              <p className='settings-warning'>
                This will replace your {habits.length} habit{habits.length === 1 ? '' : 's'} and all
                completions.
              </p>
            )}
            <input
              ref={fileRef}
              type='file'
              accept='.json'
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <button className='btn-cancel' onClick={() => fileRef.current?.click()}>
              Import from file
            </button>
          </div>
          {status && (
            <p className={status.ok ? 'settings-status-ok' : 'settings-status-error'}>
              {status.message}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
