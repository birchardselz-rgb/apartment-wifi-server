import { ModulePage } from "../components/ModulePage";
export default function TicketsPage() { return <ModulePage config={{ eyebrow: "SERVICE DESK", title: "Work orders", description: "Resolve requests with a calmer, more focused queue.", keys: ["tickets", "workorders", "workOrders"], columns: ["title", "type", "status", "createdAt"] }} />; }
