import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getGuestBookings } from "../../services/bookingService";
import {
  REQUEST_PRIORITY,
  REQUEST_STATUS,
  REQUEST_TYPE,
  REQUEST_TYPE_META,
  cancelServiceRequest,
  createServiceRequest,
  getServiceRequests,
} from "../../services/serviceRequestService";
import { formatRelative } from "../../utils/format";
import "../../styles/dashboard.css";

/**
 * Everything the guest has asked us for, and the form to ask for more.
 *
 * The dashboard's quick actions link here with `?new=<TYPE>`, which opens the
 * form with that type pre-selected — one tap from "Room Service" on the
 * dashboard to a filled-in request.
 */

const OPEN_STATUSES = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.ASSIGNED,
  REQUEST_STATUS.IN_PROGRESS,
];

const TABS = [
  { id: "open", label: "Open" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

const PRIORITIES = [
  { value: REQUEST_PRIORITY.LOW, label: "Low — whenever suits" },
  { value: REQUEST_PRIORITY.NORMAL, label: "Normal" },
  { value: REQUEST_PRIORITY.HIGH, label: "High — soon please" },
  { value: REQUEST_PRIORITY.URGENT, label: "Urgent — right away" },
];

function ServiceRequests() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState("open");
  const [cancelling, setCancelling] = useState(null);

  // A `?new=TYPE` parameter opens the form pre-selected on that type.
  const requestedType = searchParams.get("new");
  const [isFormOpen, setIsFormOpen] = useState(Boolean(requestedType));
  const [form, setForm] = useState({
    type: requestedType ?? REQUEST_TYPE.ROOM_SERVICE,
    title: "",
    details: "",
    priority: REQUEST_PRIORITY.NORMAL,
  });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(
    () => getServiceRequests({ guestId: user.id, pageSize: 50 }),
    [user.id],
  );
  const { data, isLoading, error, reload } = useAsync(load);

  // Attach a new request to the stay the guest is actually on, when there is one.
  const loadStay = useCallback(() => getGuestBookings(user.id), [user.id]);
  const stays = useAsync(loadStay);
  const activeStay = stays.data?.current?.[0] ?? null;

  const items = useMemo(() => data?.items ?? [], [data]);

  const counts = useMemo(
    () => ({
      open: items.filter((item) => OPEN_STATUSES.includes(item.status)).length,
      completed: items.filter((item) => item.status === REQUEST_STATUS.COMPLETED).length,
      all: items.length,
    }),
    [items],
  );

  const visible = useMemo(() => {
    if (tab === "open") return items.filter((item) => OPEN_STATUSES.includes(item.status));
    if (tab === "completed") {
      return items.filter((item) => item.status === REQUEST_STATUS.COMPLETED);
    }
    return items;
  }, [items, tab]);

  function closeForm() {
    setIsFormOpen(false);
    setFormError("");
    // Drop ?new= so a refresh doesn't reopen the dialog.
    if (searchParams.has("new")) {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (isSaving) return;

    if (!form.title.trim()) {
      setFormError("Please give your request a short title.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      await createServiceRequest({
        ...form,
        title: form.title.trim(),
        details: form.details.trim(),
        guestId: user.id,
        guestName: user.name,
        bookingId: activeStay?.id ?? null,
        roomNumber: activeStay?.roomNumber ?? null,
      });

      toast.success("Our team has your request and will be in touch shortly.", {
        title: "Request sent",
      });
      closeForm();
      setForm({
        type: REQUEST_TYPE.ROOM_SERVICE,
        title: "",
        details: "",
        priority: REQUEST_PRIORITY.NORMAL,
      });
      reload();
    } catch (createError) {
      setFormError(createError.message || "We couldn't send that request. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    try {
      await cancelServiceRequest(cancelling.id);
      toast.success(`${cancelling.reference} has been cancelled.`);
      setCancelling(null);
      reload();
    } catch (cancelError) {
      toast.error(cancelError.message || "We couldn't cancel that request.");
      setCancelling(null);
    }
  }

  if (error) {
    return (
      <ErrorState title="We couldn't load your requests" message={error.message} onRetry={reload} />
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          marginBottom: "var(--space-5)",
        }}
      >
        <ul className="shms-tabs" style={{ marginBottom: 0 }}>
          {TABS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                className="shms-tab"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
                <span className="shms-tab-count">{counts[id]}</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="shms-btn shms-btn-primary shms-btn-sm"
          onClick={() => setIsFormOpen(true)}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          New request
        </button>
      </div>

      <section className="shms-panel">
        {isLoading ? (
          <div className="shms-panel-body">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} style={{ marginBottom: "var(--space-5)" }} aria-hidden="true">
                <div className="shms-skeleton shms-skeleton-title" />
                <div className="shms-skeleton shms-skeleton-text" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={tab === "open" ? "Nothing outstanding" : "No requests here"}
            message={
              tab === "open"
                ? "Every request you've made has been dealt with. Ask us for anything at all."
                : "Requests you make will be listed here."
            }
            icon="bi-check2-circle"
          >
            <button
              type="button"
              className="shms-btn shms-btn-primary"
              onClick={() => setIsFormOpen(true)}
            >
              Make a request
            </button>
          </EmptyState>
        ) : (
          <ul className="shms-rows">
            {visible.map((item) => {
              const meta = REQUEST_TYPE_META[item.type] ?? { label: item.type, icon: "bi-bell" };
              const isOpen = OPEN_STATUSES.includes(item.status);

              return (
                <li key={item.id}>
                  <div className="shms-row">
                    <span className="shms-row-icon" aria-hidden="true">
                      <i className={`bi ${meta.icon}`} />
                    </span>

                    <div className="shms-row-copy">
                      <p className="shms-row-title">
                        {item.title}
                        <StatusBadge status={item.status} domain="request" />
                        {item.priority === REQUEST_PRIORITY.URGENT && (
                          <StatusBadge status={item.priority} domain="priority" />
                        )}
                      </p>
                      <p className="shms-row-meta">
                        {meta.label} · {item.reference} · {formatRelative(item.createdAt)}
                        {item.assignedToName && ` · ${item.assignedToName}`}
                        {item.details && ` — ${item.details}`}
                      </p>
                    </div>

                    <div className="shms-row-aside">
                      {isOpen && (
                        <button
                          type="button"
                          className="shms-btn shms-btn-outline shms-btn-sm"
                          onClick={() => setCancelling(item)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ----------------------------------------------------- New request */}
      {isFormOpen && (
        <Modal
          title="What can we do for you?"
          subtitle={
            activeStay
              ? `This will be attached to your stay in room ${activeStay.roomNumber ?? "—"}.`
              : "We'll link this to your booking when you arrive."
          }
          icon="bi-bell"
          dismissible={!isSaving}
          onClose={closeForm}
          footer={
            <>
              <button
                type="button"
                className="shms-btn shms-btn-outline"
                onClick={closeForm}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="new-request-form"
                className="shms-btn shms-btn-primary"
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="shms-spinner" aria-hidden="true" />
                    Sending&hellip;
                  </>
                ) : (
                  "Send request"
                )}
              </button>
            </>
          }
        >
          <form className="shms-form" id="new-request-form" onSubmit={handleCreate} noValidate>
            {formError && (
              <div className="shms-alert" role="alert">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <div className="shms-field">
              <label className="shms-label" htmlFor="request-type">
                What do you need?
              </label>
              <div className="shms-input-shell">
                <select
                  id="request-type"
                  className="shms-input shms-input-bare"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  disabled={isSaving}
                >
                  {Object.entries(REQUEST_TYPE_META).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="shms-field">
              <label className="shms-label" htmlFor="request-title">
                Short summary
              </label>
              <div className="shms-input-shell">
                <input
                  id="request-title"
                  type="text"
                  className="shms-input shms-input-bare"
                  placeholder="Extra towels, breakfast at 08:00, airport transfer…"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  maxLength={120}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="shms-field">
              <label className="shms-label" htmlFor="request-details">
                Anything else we should know
                <span className="shms-label-optional">optional</span>
              </label>
              <div className="shms-input-shell">
                <textarea
                  id="request-details"
                  className="shms-input shms-input-bare"
                  placeholder="Timing, dietary needs, how many people…"
                  value={form.details}
                  onChange={(event) => setForm({ ...form, details: event.target.value })}
                  maxLength={500}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="shms-field">
              <label className="shms-label" htmlFor="request-priority">
                How urgent is it?
              </label>
              <div className="shms-input-shell">
                <select
                  id="request-priority"
                  className="shms-input shms-input-bare"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                  disabled={isSaving}
                >
                  {PRIORITIES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Cancel this request?"
          message={`"${cancelling.title}" (${cancelling.reference}) will be withdrawn. You can always ask again.`}
          confirmLabel="Yes, cancel it"
          cancelLabel="Keep it"
          onConfirm={handleCancel}
          onCancel={() => setCancelling(null)}
        />
      )}
    </>
  );
}

export default ServiceRequests;
