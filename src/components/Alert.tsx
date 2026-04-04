import { AlertDialog } from 'radix-ui';

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
  cancel: string;
  open: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  variant?: 'danger' | 'primary';
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className='alert-overlay' />
        <AlertDialog.Content className='alert-content'>
          <AlertDialog.Title className='modal-title'>{title}</AlertDialog.Title>
          <AlertDialog.Description className='modal-description'>
            {description}
          </AlertDialog.Description>
          <div className='modal-actions'>
            <AlertDialog.Cancel className='btn-base btn-ghost'>{cancel}</AlertDialog.Cancel>
            <AlertDialog.Action className={`btn-base btn-${variant}`} onClick={onConfirm}>
              {confirm}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
