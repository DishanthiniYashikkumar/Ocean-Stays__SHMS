import RequestQueue from "../../components/service/RequestQueue";

/** Every request of every type, for when the queue matters more than the category. */
function GuestRequests() {
  return <RequestQueue title="Guest requests" emptyIcon="bi-bell" />;
}

export default GuestRequests;
