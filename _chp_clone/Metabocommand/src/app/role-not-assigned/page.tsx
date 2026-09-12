export default function RoleNotAssignedPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-slate-900">Role Not Assigned</h1>
        <p className="mt-3 text-slate-600">
          Your account has not been assigned a role. Please contact your administrator
          to assign you either the Finance or Operations role before continuing.
        </p>
      </div>
    </div>
  );
}
