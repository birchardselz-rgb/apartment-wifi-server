import { ModulePage } from "../components/ModulePage";
export default function SettingsPage() { return <ModulePage config={{ eyebrow: "SETTINGS", title: "System settings", description: "Review connected records and administrative configuration.", keys: ["staff", "users", "settings"], columns: ["name", "username", "role", "status"] }} />; }
