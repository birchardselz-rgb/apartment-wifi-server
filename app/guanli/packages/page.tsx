import { ModulePage } from "../components/ModulePage";
export default function PackagesPage() { return <ModulePage config={{ eyebrow: "PACKAGES", title: "Service packages", description: "Manage the plans your customers can choose from.", keys: ["packages", "packageList"], columns: ["name", "price", "duration", "status"] }} />; }
