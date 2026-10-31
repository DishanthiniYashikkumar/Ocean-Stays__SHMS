import RequestQueue from "../../components/service/RequestQueue";
import { REQUEST_TYPE } from "../../services/serviceRequestService";

/** Airport transfers, excursions and anything else with a vehicle. */
function TransportRequests() {
  return (
    <RequestQueue
      type={REQUEST_TYPE.TRANSPORT}
      title="Transport requests"
      emptyIcon="bi-car-front"
    />
  );
}

export default TransportRequests;
