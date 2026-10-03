import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, description, trailing, children, className = "" }: SectionCardProps) {
  return (
    <section className={`card ${className}`.trim()}>
      <div className="card__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}
