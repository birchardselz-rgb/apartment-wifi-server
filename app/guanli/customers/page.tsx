import { ModulePage } from "../components/ModulePage";
export default function CustomersPage() { return <ModulePage config={{ eyebrow: "CUSTOMERS", title: "Customer directory", description: "Keep resident and service information clear and current.", keys: ["clients", "customers", "tenants"], columns: ["name", "phone", "roomNumber", "status"] }} />; }
