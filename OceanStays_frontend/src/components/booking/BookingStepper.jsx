import { Fragment } from "react";
import "../../styles/booking.css";

/**
 * Progress indicator for the booking flow.
 *
 * Presentational only — the flow owns which step is current. Completed steps
 * are marked with a tick and announced to assistive technology, so the list
 * reads as progress rather than as navigation.
 *
 * @param {{ steps: Array<{ id: string, label: string }>, current: number }} props
 */
function BookingStepper({ steps, current }) {
  return (
    <ol className="shms-stepper" aria-label="Booking progress">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;

        const state = isDone ? " is-done" : isCurrent ? " is-current" : "";

        return (
          <Fragment key={step.id}>
            <li className={`shms-step${state}`} aria-current={isCurrent ? "step" : undefined}>
              <span className="shms-step-marker" aria-hidden="true">
                {isDone ? <i className="bi bi-check-lg" /> : index + 1}
              </span>

              <span className="shms-step-label">
                <small>Step {index + 1}</small>
                <strong>{step.label}</strong>
              </span>

              <span className="visually-hidden">
                {isDone ? "completed" : isCurrent ? "current step" : "not started"}
              </span>
            </li>

            {index < steps.length - 1 && (
              <span
                className={`shms-step-line${isDone ? " is-done" : ""}`}
                aria-hidden="true"
                style={isDone ? { background: "var(--success-edge)" } : undefined}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

export default BookingStepper;
