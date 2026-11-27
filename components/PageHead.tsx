import type { ReactNode } from 'react';
import styles from './PageHead.module.css';

type Props = {
  kicker: string;
  top: string;
  bottom?: string;
  sub?: ReactNode;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2';
  children?: ReactNode;
};

export function PageHead({ kicker, top, bottom, sub, align = 'left', as: Tag = 'h1', children }: Props) {
  return (
    <header className={`${styles.head} ${align === 'center' ? styles.center : ''}`}>
      <p className={styles.kicker}>{kicker}</p>
      <Tag className={styles.title}>
        <span>{top}</span>
        {bottom && <span className={styles.dim}>{bottom}</span>}
      </Tag>
      {sub && <p className={styles.sub}>{sub}</p>}
      {children}
    </header>
  );
}
