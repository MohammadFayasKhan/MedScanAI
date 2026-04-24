import AnimatedButton from '../AnimatedButton';
import Modal from './Modal';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'info',
}: ConfirmationDialogProps) {
  const toneClass =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-white'
      : 'bg-primary hover:bg-primary-light text-background';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-text-secondary">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <AnimatedButton variant="ghost" onClick={onClose}>
          {cancelText}
        </AnimatedButton>
        <AnimatedButton className={toneClass} onClick={onConfirm}>
          {confirmText}
        </AnimatedButton>
      </div>
    </Modal>
  );
}
