import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">MetaboCommand</h1>
          <p className="mt-2 text-sm text-slate-600">Metabolic Commerce Multi-Agent Platform</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
