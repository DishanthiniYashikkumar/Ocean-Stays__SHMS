import RequestQueue from "../../components/service/RequestQueue";
import { REQUEST_TYPE } from "../../services/serviceRequestService";

/** Restaurant bookings and dietary arrangements. */
function DiningRequests() {
  return (
    <RequestQueue type={REQUEST_TYPE.DINING} title="Dining requests" emptyIcon="bi-egg-fried" />
  );
}

export default DiningRequests;
