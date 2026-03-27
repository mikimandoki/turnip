import { AlertDialog } from 'radix-ui';

export default function Alert({
  title,
  description,
  confirm,
  cancel,
  open,
  onConfirm,
  onOpenChange,
}: {
  title: string;
  description: string;
  confirm: string;
  cancel: string;
  open: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className='modal-overlay' />
        <AlertDialog.Content className='modal-content'>
          <AlertDialog.Title className='modal-title'>{title}</AlertDialog.Title>
          <AlertDialog.Description className='modal-description'>
            {description}
          </AlertDialog.Description>
          <div className='modal-actions'>
            <AlertDialog.Cancel className='btn-cancel'>{cancel}</AlertDialog.Cancel>
            <AlertDialog.Action className='btn-danger' onClick={onConfirm}>
              {confirm}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
