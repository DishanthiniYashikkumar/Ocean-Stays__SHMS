import { useId } from "react";

/**
 * The dashboard's content card: optional head (title, subtitle, actions) and
 * a body. `flush` removes the body padding for tables and row lists.
 *
 *   <Panel title="Arrivals today" subtitle="3 expected" actions={<Link …/>}>
 *     …
 *   </Panel>
 *
 * Pass `bodyless` when the children already include their own
 * `.shms-panel-body` (e.g. a <PanelSkeleton/> or <EmptyState/>).
 *
 * @param {{
 *   title?: import("react").ReactNode,
 *   subtitle?: import("react").ReactNode,
 *   actions?: import("react").ReactNode,
 *   flush?: boolean,
 *   bodyless?: boolean,
 *   className?: string,
 *   as?: keyof JSX.IntrinsicElements,
 *   children?: import("react").ReactNode,
 * }} props
 */
function Panel({
  title,
  subtitle,
  actions,
  flush = false,
  bodyless = false,
  className = "",
  as: Tag = "section",
  children,
  ...rest
}) {
  const headingId = useId();
  const hasHead = Boolean(title || subtitle || actions);

  return (
    <Tag
      className={`shms-panel ${className}`.trim()}
      aria-labelledby={title ? headingId : undefined}
      {...rest}
    >
      {hasHead && (
        <header className="shms-panel-head">
          <div>
            {title && <h2 id={headingId}>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="shms-panel-actions">{actions}</div>}
        </header>
      )}

      {bodyless ? (
        children
      ) : (
        <div className={flush ? "shms-panel-body shms-panel-body-flush" : "shms-panel-body"}>
          {children}
        </div>
      )}
    </Tag>
  );
}

export default Panel;
