import { EllipsisVertical } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';

import type { AriaLabel } from '../types';

import styles from './ActionMenu.module.css';

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type Separator = { separator: true };

export default function ActionMenu({
  items,
  ariaLabel,
}: {
  items: (MenuItem | Separator)[];
  ariaLabel: AriaLabel;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={`btn-action ${styles.trigger}`} aria-label={ariaLabel}>
        <EllipsisVertical size={16} />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.content} sideOffset={4} align='end'>
          {items.map((item, i) => {
            if ('separator' in item) {
              return <DropdownMenu.Separator key={i} className={styles.separator} />;
            }
            return (
              <DropdownMenu.Item
                key={i}
                className={`${styles.item} ${item.danger ? styles.itemDanger : ''}`}
                onClick={item.onClick}
              >
                <span className={styles.itemIcon}>{item.icon}</span>
                {item.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
