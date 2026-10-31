import RequestQueue from "../../components/service/RequestQueue";
import { REQUEST_TYPE } from "../../services/serviceRequestService";

/**
 * Faults to fix. These mostly arrive from housekeeping rather than from
 * guests — see reportMaintenanceIssue in housekeepingService.
 */
function MaintenanceRequests() {
  return (
    <RequestQueue type={REQUEST_TYPE.MAINTENANCE} title="Maintenance" emptyIcon="bi-tools" />
  );
}

export default MaintenanceRequests;
