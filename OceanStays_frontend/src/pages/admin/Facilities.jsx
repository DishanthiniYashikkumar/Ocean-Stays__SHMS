import { useCallback, useMemo, useState } from "react";
import DataTable from "../../components/common/DataTable";
import FormField from "../../components/common/FormField";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useToast } from "../../hooks/useToast";
import {
  FACILITY_STATUS,
  createFacility,
  getFacilities,
  updateFacility,
} from "../../services/contentService";
import { getStatusMeta } from "../../utils/status";
import { required, validate } from "../../utils/validation";
import "../../styles/dashboard.css";

/** Hotel facilities: what's open, what's closed, and who runs it. */

const STATUS_OPTIONS = Object.values(FACILITY_STATUS).map((status) => ({
  value: status,
  label: getStatusMeta(status, "facility").label,
}));

const STATUS_FILTER = [{ value: "", label: "All statuses" }, ...STATUS_OPTIONS];

const EMPTY = {
  name: "",
  department: "",
  summary: "",
  hours: "",
  capacity: 0,
  icon: "bi-building",
  status: FACILITY_STATUS.OPEN,
};

const RULES = {
  name: [required("Facility name")],
  department: [required("Department")],
};

function Facilities() {
  const toast = useToast();

  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null); // a facility, or "new"
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => getFacilities(), []);
  const { data, isLoading, error, reload } = useAsync(load);

  const rows = useMemo(() => {
    const items = data ?? [];
    return status ? items.filter((item) => item.status === status) : items;
  }, [data, status]);

  function openEditor(facility) {
    setEditing(facility ?? "new");
    setForm(facility ? { ...EMPTY, ...facility } : EMPTY);
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
      if (editing === "new") {
        await createFacility(form);
        toast.success(`${form.name} added.`, { title: "Facility created" });
      } else {
        await updateFacility(editing.id, form);
        toast.success(`${form.name} updated.`, { title: "Facility saved" });
      }
      setEditing(null);
      reload();
    } catch (saveError) {
      toast.error(saveError.message || "We couldn't save that facility.");
    } finally {
      setIsSaving(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Facility",
      sortable: true,
      render: (row) => (
        <>
          <span className="shms-cell-strong">
            <i className={`bi ${row.icon}`} aria-hidden="true" /> {row.name}
          </span>
          <br />
          <span className="shms-cell-muted">{row.summary}</span>
        </>
      ),
    },
    { key: "department", header: "Department", sortable: true },
    { key: "hours", header: "Hours" },
    {
      key: "description",
      header: "Description",
      // The live API returns `description`; the mock data stores it as `summary`.
      render: (row) =>
        row.description || row.summary ? (
          <span style={{ display: "block", maxWidth: 320, whiteSpace: "normal", overflowWrap: "anywhere" }}>
            {row.description || row.summary}
          </span>
        ) : (
          <span className="shms-cell-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} domain="facility" />,
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
        searchPlaceholder="Search facility or department"
        searchKeys={["name", "department", "summary"]}
        filters={[
          { id: "status", label: "Status", value: status, options: STATUS_FILTER, onChange: setStatus },
        ]}
        toolbarEnd={
          <button
            type="button"
            className="shms-btn shms-btn-primary shms-btn-sm"
            onClick={() => openEditor(null)}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add facility
          </button>
        }
        caption="Hotel facilities"
        emptyState={{
          title: "No facilities found",
          message: "Try clearing the status filter.",
          icon: "bi-buildings",
        }}
      />

      {editing && (
        <Modal
          title={editing === "new" ? "Add a facility" : `Edit ${editing.name}`}
          icon="bi-buildings"
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
                form="admin-facility-form"
                className="shms-btn shms-btn-primary"
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="shms-spinner" aria-hidden="true" />
                    Saving&hellip;
                  </>
                ) : editing === "new" ? (
                  "Add facility"
                ) : (
                  "Save changes"
                )}
              </button>
            </>
          }
        >
          <form className="shms-form" id="admin-facility-form" onSubmit={handleSave} noValidate>
            <FormField
              id="facility-name"
              name="name"
              label="Name"
              icon="bi-buildings"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
              disabled={isSaving}
            />

            <div className="shms-auth-row">
              <FormField
                id="facility-department"
                name="department"
                label="Department"
                icon="bi-diagram-3"
                value={form.department}
                onChange={handleChange}
                error={errors.department}
                required
                disabled={isSaving}
              />
              <FormField
                id="facility-capacity"
                name="capacity"
                label="Capacity"
                type="number"
                min={0}
                value={form.capacity}
                onChange={handleChange}
                disabled={isSaving}
                hint="0 if not applicable"
              />
            </div>

            <FormField
              id="facility-hours"
              name="hours"
              label="Opening hours"
              icon="bi-clock"
              placeholder="06:00 – 20:00"
              value={form.hours}
              onChange={handleChange}
              disabled={isSaving}
            />

            <FormField
              id="facility-summary"
              name="summary"
              label="Description"
              type="textarea"
              maxLength={200}
              value={form.summary}
              onChange={handleChange}
              disabled={isSaving}
              hint="Shown to guests on the public facilities page."
            />

            <FormField
              id="facility-status"
              name="status"
              label="Status"
              type="select"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={handleChange}
              required
              disabled={isSaving}
              hint="Closing a facility also removes it from the public site."
            />
          </form>
        </Modal>
      )}
    </>
  );
}

export default Facilities;
