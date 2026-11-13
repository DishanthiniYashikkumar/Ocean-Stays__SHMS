import { Link } from "react-router-dom";

/**
 * Hero band at the top of public inner pages (Rooms, Facilities, Contact …):
 * breadcrumb, title, accent rule and a lede.
 *
 *   <PageHeader title="Experiences" crumbs={[{ to: "/", label: "Home" }]}>
 *     Whales off the shelf at dawn…
 *   </PageHeader>
 *
 * The last crumb is the current page and is added automatically from `title`
 * unless `current` overrides it.
 *
 * @param {{
 *   title: import("react").ReactNode,
 *   crumbs?: Array<{ to: string, label: string }>,
 *   current?: string,
 *   compact?: boolean,
 *   children?: import("react").ReactNode,
 * }} props
 */
function PageHeader({ title, crumbs = [{ to: "/", label: "Home" }], current, compact = false, children }) {
  return (
    <header className={`shms-page-head${compact ? " shms-page-head-compact" : ""}`}>
      <div className="shms-container">
        <ul className="shms-breadcrumb">
          {crumbs.map((crumb) => (
            <li key={crumb.to} className="shms-breadcrumb-item">
              <Link to={crumb.to}>{crumb.label}</Link>
              <span aria-hidden="true">/</span>
            </li>
          ))}
          <li aria-current="page">{current ?? title}</li>
        </ul>

        <h1>{title}</h1>
        <span className="shms-rule-gold" />
        {children && <p>{children}</p>}
      </div>
    </header>
  );
}

export default PageHeader;
