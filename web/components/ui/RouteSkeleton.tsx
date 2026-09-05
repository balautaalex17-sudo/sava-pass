import type { CSSProperties } from "react";
import styles from "./route-skeleton.module.css";

export function Skeleton({ width = "100%", height = 16, style }: { width?: CSSProperties["width"]; height?: CSSProperties["height"]; style?: CSSProperties }) {
  return <span aria-hidden="true" className={styles.block} style={{ width, height, ...style }} />;
}

export function FormSkeleton() {
  return <div className={styles.form} aria-hidden="true">{[0, 1, 2, 3].map((field) => <div key={field}><Skeleton width="35%" height={12} /><Skeleton height={46} /></div>)}</div>;
}
