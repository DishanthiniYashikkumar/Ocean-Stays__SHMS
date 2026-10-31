import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import DataTable from "../../components/common/DataTable";
import FormField from "../../components/common/FormField";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import { ROLES, ROLE_LABELS, getUsers, updateProfile, updateUserStatus } from "../../services/userService";
import { email as emailRule, phone as phoneRule, required, validate } from "../../utils/validation";
import { formatDate } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * User administration.
 *
 * Editing goes through `updateProfile` and status through `updateUserStatus`,
 * both already in userService. Accounts are deactivated rather than deleted:
 * a user is referenced by bookings, requests and the audit trail, and removing
 * the row would orphan all of it.
 */

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", role: ROLES.GUEST };

const RULES = {
  firstName: [required("First name")],
  lastName: [required("Last name")],
  email: [required("Email address"), emailRule()],
  phone: [required("Phone number"), phoneRule()],
};

const ROLE_OPTIONS = Object.values(ROLES).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

const ROLE_FILTER = [{ value: "", label: "All roles" }, ...ROLE_OPTIONS];
const STATUS_FILTER = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function Users() {
  const toast = useToast();

  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => getUsers({ pageSize: 500 }), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const rows = useMemo(() => {
    let items = data?.items ?? [];
    if (role) items = items.filter((item) => item.role === role);
    if (status) items = items.filter((item) => item.status === status);
    return items;
  }, [data, role, status]);

  function openEditor(user) {
    setEditing(user);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role,
    });
    setErrors({});
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...form, [name]: value };
    setForm(next);
    if (errors[name]) setErrors(validate(next, RULES));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (isSaving) return;

    const nextErrors = validate(form, RULES);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await updateProfile(editing.id, form);
      toast.success(`${form.firstName} ${form.lastName} updated.`, { title: "User saved" });
      setEditing(null);
      reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't save that user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus() {
    const user = confirming;
    const next = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setConfirming(null);

    try {
      await updateUserStatus(user.id, next);
      toast.success(
        next === "ACTIVE"
          ? `${user.name} can sign in again.`
          : `${user.name} has been deactivated and can no longer sign in.`,
      );
      reload();
    } catch (statusError) {
      toast.error(statusError.message || "We couldn't change that account.");
    }
  }

  const columns = [
    {
      key: "name",
      header: "User",
      sortable: true,
      render: (row) => (
        <>
          <span className="shms-cell-strong">{row.name}</span>
          <br />
          <span className="shms-cell-muted">{row.email}</span>
        </>
      ),
    },
    { key: "phone", header: "Phone" },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (row) => ROLE_LABELS[row.role] ?? row.role,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      render: (row) => row.department ?? <span className="shms-cell-muted">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} domain="user" />,
    },
    {
      key: "lastLoginAt",
      header: "Last sign-in",
      sortable: true,
      render: (row) => formatDate(row.lastLoginAt),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="shms-row-actions">
          <button
            type="button"
            className="shms-btn shms-btn-outline shms-btn-sm"
            onClick={() => openEditor(row)}
          >
            Edit
          </button>
          <button
            type="button"
            className={`shms-btn shms-btn-sm ${row.status === "ACTIVE" ? "shms-btn-danger" : "shms-btn-primary"}`}
            onClick={() => setConfirming(row)}
          >
            {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search name, email or phone"
        searchKeys={["name", "email", "phone", "department"]}
        filters={[
          { id: "role", label: "Role", value: role, options: ROLE_FILTER, onChange: setRole },
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        caption="All user accounts"
        emptyState={{
          title: "No users found",
          message: "Try clearing a filter, or widen the search.",
          icon: "bi-people",
        }}
      />

      {/* --------------------------------------------------------- Edit */}
      {editing && (
        <Modal
          title={`Edit ${editing.name}`}
          subtitle={editing.id}
          icon="bi-person-gear"
          size="lg"
          dismissible={!isSaving}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={() => setEditing(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-user-form"
                className="shms-btn shms-btn-primary"
                disabled={isSaving}
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
            </>
          }
        >
          <form className="shms-form" id="admin-user-form" onSubmit={handleSave} noValidate>
            <div className="shms-auth-row">
              <FormField
                id="user-firstName"
                name="firstName"
                label="First name"
                icon="bi-person"
                value={form.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
                disabled={isSaving}
              />
              <FormField
                id="user-lastName"
                name="lastName"
                label="Last name"
                icon="bi-person"
                value={form.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
                disabled={isSaving}
              />
            </div>

            <FormField
              id="user-email"
              name="email"
              label="Email address"
              type="email"
              icon="bi-envelope"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
              disabled={isSaving}
            />

            <FormField
              id="user-phone"
              name="phone"
              label="Phone number"
              type="tel"
              icon="bi-telephone"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              required
              disabled={isSaving}
            />

            <FormField
              id="user-role"
              name="role"
              label="Role"
              type="select"
              options={ROLE_OPTIONS}
              value={form.role}
              onChange={handleChange}
              required
              disabled={isSaving}
              hint="Determines which dashboard and permissions this account gets."
            />
          </form>
        </Modal>
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.status === "ACTIVE" ? "Deactivate this account?" : "Reactivate this account?"}
          message={
            confirming.status === "ACTIVE"
              ? `${confirming.name} will no longer be able to sign in. Their bookings, requests and audit history are kept — this is why we deactivate rather than delete.`
              : `${confirming.name} will be able to sign in again with their existing password.`
          }
          confirmLabel={confirming.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
          cancelLabel="Keep as is"
          tone={confirming.status === "ACTIVE" ? "danger" : "default"}
          icon={confirming.status === "ACTIVE" ? "bi-person-slash" : "bi-person-check"}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  );
}

export default Users;
