import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => (
  <div className="px-6 py-6 space-y-6">
    <div className="flex items-center gap-3">
      <SettingsIcon className="w-5 h-5 text-primary" />
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
    </div>
    <p className="text-sm text-muted-foreground">
      Network configuration, API endpoints, and wallet preferences.
    </p>
    <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
      Settings interface coming soon.
    </div>
  </div>
);

export default Settings;
