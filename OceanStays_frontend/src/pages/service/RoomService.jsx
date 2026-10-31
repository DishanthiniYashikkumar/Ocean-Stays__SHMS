import RequestQueue from "../../components/service/RequestQueue";
import { REQUEST_TYPE } from "../../services/serviceRequestService";

/** Food and drink ordered to a room. */
function RoomService() {
  return (
    <RequestQueue
      type={REQUEST_TYPE.ROOM_SERVICE}
      title="Room service"
      emptyIcon="bi-cup-hot"
    />
  );
}

export default RoomService;
