import { ModulePage } from "../components/ModulePage";
export default function FinancePage() { return <ModulePage config={{ eyebrow: "FINANCE", title: "Billing overview", description: "Make revenue and payment records easier to review.", keys: ["income", "payments", "finance", "orders"], columns: ["name", "amount", "status", "createdAt"] }} />; }
