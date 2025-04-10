import LoginForm from '@/components/login-form';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="p-8 rounded shadow-md bg-card w-96">
        <h1 className="text-2xl font-semibold text-center mb-4">Welcome to AttendAI</h1>
        <LoginForm />
      </div>
    </main>
  );
}
