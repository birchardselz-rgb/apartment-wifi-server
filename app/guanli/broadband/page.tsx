import { ModulePage } from "../components/ModulePage";
export default function BroadbandPage() { return <ModulePage config={{ eyebrow: "BROADBAND", title: "Network services", description: "See active broadband plans and connection status at a glance.", keys: ["broadband", "broadbands", "orders", "subscriptions"], columns: ["name", "phone", "roomNumber", "status"] }} />; }
