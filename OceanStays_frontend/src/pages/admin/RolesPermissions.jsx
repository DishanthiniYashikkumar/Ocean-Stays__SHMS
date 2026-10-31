import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import ErrorState from "../../components/common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  PERMISSION_GROUPS,
  getRoles,
  updateRolePermissions,
} from "../../services/permissionService";
import { ROLES } from "../../services/roles";
import "../../styles/dashboard.css";
import "../../styles/admin.css";

/**
 * Roles and what each may do.
 *
 * A matrix rather than a list: eighty permissions read as noise ungrouped, but
 * grouped by module an administrator can scan a role in seconds.
 *
 * Administrator is shown read-only. An admin who removes their own
 * `admin.permissions` locks everybody out of this screen with no way back, and
 * there is no second admin role to recover through — so the service refuses it
 * and the UI does not offer it.
 */
/**
 * The permission matrix for one role.
 *
 * Its draft is seeded once on mount. The parent gives it a `key` of the role
 * id, so selecting a different role remounts it with that role's permissions —
 * React's own answer to "reset state when a prop changes", and cheaper than
 * synchronising two sources of truth in an effect.
 */
function PermissionPanel({ role, onSave, isSaving }) {
  const [draft, setDraft] = useState(role.permissions);
  const [confirming, setConfirming] = useState(false);

  const isLocked = role.id === ROLES.ADMIN;
  const totalPermissions = PERMISSION_GROUPS.reduce(
    (sum, group) => sum + group.permissions.length,
    0,
  );

  const isDirty = useMemo(
    () => [...role.permissions].sort().join() !== [...draft].sort().join(),
    [role.permissions, draft],
  );

  function toggle(permissionId) {
    setDraft((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    );
  }

  return (
    <section className="shms-panel" style={{ marginBottom: 0 }}>
      <div className="shms-panel-head">
        <div>
          <h2>{role.label} permissions</h2>
          <p>
            {isLocked ? totalPermissions : draft.length} of {totalPermissions} granted
          </p>
        </div>

        {isLocked ? (
          <span className="shms-badge shms-badge-gold">
            <i className="bi bi-lock" aria-hidden="true" /> Always full access
          </span>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="shms-btn shms-btn-outline shms-btn-sm"
              onClick={() => setDraft(role.permissions)}
              disabled={!isDirty || isSaving}
            >
              Reset
            </button>
            <button
              type="button"
              className="shms-btn shms-btn-primary shms-btn-sm"
              onClick={() => setConfirming(true)}
              disabled={!isDirty || isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="shms-spinner" aria-hidden="true" />
                  Saving&hellip;
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        )}
      </div>

      {isLocked && (
        <p className="shms-hosted-note" style={{ margin: "var(--space-5)" }}>
          <i className="bi bi-shield-lock" aria-hidden="true" />
          <span>
            The Administrator role holds every permission and can&apos;t be narrowed. Removing
            its access to this screen would leave nobody able to restore it.
          </span>
        </p>
      )}

      {PERMISSION_GROUPS.map((group) => (
        <div className="shms-perm-group" key={group.module}>
          <div className="shms-perm-head">
            <i className={`bi ${group.icon}`} aria-hidden="true" />
            <h3>{group.module}</h3>
          </div>

          <ul className="shms-perm-list">
            {group.permissions.map((permission) => (
              <li key={permission.id}>
                <label
                  className={`shms-perm-item${isLocked ? " is-locked" : ""}`}
                  htmlFor={`perm-${permission.id}`}
                >
                  <input
                    id={`perm-${permission.id}`}
                    type="checkbox"
                    checked={isLocked || draft.includes(permission.id)}
                    onChange={() => toggle(permission.id)}
                    disabled={isLocked || isSaving}
                  />
                  {permission.label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {confirming && (
        <ConfirmDialog
          title={`Change ${role.label} permissions?`}
          message={`${role.userCount} ${role.userCount === 1 ? "user holds" : "users hold"} this role. The change takes effect the next time they load a page, and may remove access they are relying on right now.`}
          confirmLabel="Apply changes"
          cancelLabel="Go back"
          tone="warning"
          icon="bi-shield-exclamation"
          onConfirm={() => {
            setConfirming(false);
            onSave(draft);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}

function RolesPermissions() {
  const toast = useToast();

  const load = useCallback(() => getRoles(), []);
  const { data: roles, isLoading, error, reload } = useAsync(load);

  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const selected = useMemo(
    () => roles?.find((role) => role.id === selectedId) ?? roles?.[0] ?? null,
    [roles, selectedId],
  );

  async function handleSave(permissions) {
    setIsSaving(true);
    try {
      await updateRolePermissions(selected.id, permissions);
      toast.success(`${selected.label} permissions updated.`, { title: "Saved" });
      reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't save those permissions.");
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return <ErrorState title="We couldn't load roles" message={error.message} onRetry={reload} />;
  }

  if (isLoading || !selected) {
    return (
      <div className="shms-perm-layout">
        <div className="shms-skeleton" style={{ height: 320, borderRadius: "var(--radius-md)" }} aria-hidden="true" />
        <div className="shms-skeleton" style={{ height: 480, borderRadius: "var(--radius-lg)" }} aria-hidden="true" />
      </div>
    );
  }

  return (
    <>
      <div className="shms-perm-layout">
        {/* ------------------------------------------------------- Roles */}
        <ul className="shms-role-list">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                type="button"
                className="shms-role-btn"
                aria-pressed={role.id === selected.id}
                onClick={() => setSelectedId(role.id)}
              >
                <span className="shms-role-name">
                  {role.label}
                  <span className="shms-role-count">
                    {role.userCount} {role.userCount === 1 ? "user" : "users"}
                  </span>
                </span>
                <span className="shms-role-desc">{role.description}</span>
              </button>
            </li>
          ))}
        </ul>
        {/* Keyed by role id: selecting a different role remounts the panel
            with that role's permissions, rather than syncing in an effect. */}
        <PermissionPanel
          key={selected.id}
          role={selected}
          isSaving={isSaving}
          onSave={handleSave}
        />
      </div>
    </>
  );
}

export default RolesPermissions;
